import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { parseLesson } from '@questly/lesson-dsl';
import { AI_PROVIDER } from './ai.constants';
import type { AiProvider } from './ai-provider';
import type { ChatDto } from './dto/chat.dto';
import type { GenerateLessonDto } from './dto/generate-lesson.dto';
import type { GenerateQuestionsDto } from './dto/generate-questions.dto';

const SYSTEM_PROMPT = `You are Nova, the built-in AI tutor for Questly, a learning platform covering
subjects from grade-school arithmetic to college-level coursework. Be encouraging, concise, and
accurate. If the student shares context about a specific lesson, ground your answer in it. If you
don't know something, say so rather than guessing.`;

// A condensed version of LESSON_DSL.md — enough for the model to produce
// syntactically valid LessonML without seeing the full spec doc.
const LESSON_ML_SYSTEM_PROMPT = `You write lesson content in Questly's LessonML, a small custom
tag-based markup language. Output ONLY raw LessonML — no markdown code fences, no commentary
before or after.

Rules:
- Tags are PascalCase XML/JSX-style: <Tag attr="value">...</Tag> or self-closing <Tag ... />.
- Attribute values are always double-quoted strings.
- Inside <Text>, <Callout>, <Hint>, <Summary>, and list <Item>s, you may use **bold**, *italic*,
  \`code\`, and [label](url) links. Question text on quiz blocks is plain text only (no markdown).

Content blocks:
<Heading level="1|2|3">...</Heading>
<Text>...</Text>
<List type="ordered|unordered"><Item>...</Item>...</List>
<Callout type="info|warning|tip">...</Callout>
<Image src="..." alt="..." />
<Math>LaTeX source</Math>
<MathGraph fn="expression in x" xmin="-10" xmax="10" />
<Hint>...</Hint> (collapsed by default)
<Summary>...</Summary> (end-of-lesson recap)
<Divider />

Quiz blocks (every one needs "question" and "points"; question is plain text, no markdown):
<MCQ question="..." correct="0-based index" points="N"><Option>...</Option><Option>...</Option></MCQ>
<Checkbox question="..." correct="[0,2]" points="N"><Option>...</Option>...</Checkbox>
<TrueFalse question="..." correct="true|false" points="N" />
<ShortAnswer question="..." accepted="answer1|answer2" points="N" />
<Numeric question="..." answer="42" tolerance="0.5" points="N" />
<OpenResponse question="..." points="N" />

Write a complete, well-structured lesson: a heading, a few Text/Callout blocks explaining the
topic, and 2-4 quiz blocks checking understanding. Mix quiz block types — don't use only one kind.`;

@Injectable()
export class AiService {
  constructor(@Inject(AI_PROVIDER) private readonly provider: AiProvider) {}

  get isConfigured(): boolean {
    return this.provider.available;
  }

  async chat(dto: ChatDto): Promise<string> {
    const system = dto.context
      ? `${SYSTEM_PROMPT}\n\nCurrent context the student is looking at:\n${dto.context}`
      : SYSTEM_PROMPT;

    const turns = [
      ...(dto.history ?? []),
      { role: 'user' as const, content: dto.message },
    ];
    return this.provider.chat(turns, system);
  }

  // Never silently hands back the NullAiProvider's "not configured" prose as
  // if it were lesson content — that string alone would parse as plain text
  // (LessonML has no required root tag) and land in a lesson's content field
  // looking like a real (broken) generation.
  async generateLesson(dto: GenerateLessonDto) {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        "Nova isn't configured — ask an admin to set ANTHROPIC_API_KEY.",
      );
    }

    const parts = [`Topic: ${dto.topic}`];
    if (dto.subject) parts.push(`Subject: ${dto.subject}`);
    if (dto.gradeLevel) parts.push(`Grade level: ${dto.gradeLevel}`);
    const userPrompt = `${parts.join('\n')}\n\nWrite the lesson now.`;

    const raw = await this.provider.chat(
      [{ role: 'user', content: userPrompt }],
      LESSON_ML_SYSTEM_PROMPT,
    );
    const content = stripCodeFence(raw);
    const parsed = parseLesson(content);

    return {
      content,
      valid: parsed.ok,
      error: parsed.ok ? null : parsed.error.message,
    };
  }

  async generateQuestions(dto: GenerateQuestionsDto) {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        "Nova isn't configured — ask an admin to set ANTHROPIC_API_KEY.",
      );
    }

    const count = dto.count ?? 25;
    const system = `Output ONLY a JSON array (no markdown fences, no commentary) of exactly ${count}
objects shaped {"q": "question text", "a": "the answer"}. Questions must be short, unambiguous,
and have a single clear correct answer suitable for a study flashcard.`;
    const raw = await this.provider.chat(
      [{ role: 'user', content: `Topic: ${dto.topic}` }],
      system,
    );

    const questions = parseQuestionsJson(stripCodeFence(raw));
    if (!questions) {
      throw new ServiceUnavailableException(
        'Nova returned an unexpected format — try again.',
      );
    }
    return { questions };
  }
}

// Models frequently wrap output in ```lessonml / ```json fences despite
// being told not to — strip them defensively rather than failing on it.
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = /^```[a-zA-Z]*\n([\s\S]*?)\n```$/.exec(trimmed);
  return match ? match[1].trim() : trimmed;
}

function parseQuestionsJson(text: string): { q: string; a: string }[] | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      Array.isArray(parsed) &&
      parsed.every(
        (item): item is { q: string; a: string } =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as Record<string, unknown>)['q'] === 'string' &&
          typeof (item as Record<string, unknown>)['a'] === 'string',
      )
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
