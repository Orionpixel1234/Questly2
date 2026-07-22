// Pure, framework-agnostic grading — no Angular/NestJS/Prisma types, so it
// runs identically in the Angular preview (instant feedback) and the NestJS
// backend (the authoritative score). See ast.ts for the block shapes this
// walks and LESSON_DSL.md for the grammar.
import { isGradableBlock, type LessonDocument } from './ast.ts';

export type AnswerValue = number | number[] | boolean | string;
// Keyed by the block's index within LessonDocument.blocks — LessonML has no
// separate "question id" concept, so position in the parsed document is the
// identifier both the renderer (submitting) and grader (scoring) agree on.
export type AnswersPayload = Record<number, AnswerValue>;

export interface AnswerFeedback {
  blockIndex: number;
  // null means "not auto-graded" (OpenResponse) — always pending manual review.
  correct: boolean | null;
  pointsAwarded: number;
  pointsPossible: number;
}

export interface GradingResult {
  hasGradableBlocks: boolean;
  autoScore: number;
  autoTotal: number;
  manualTotal: number;
  feedback: AnswerFeedback[];
}

export function gradeAnswers(document: LessonDocument, answers: AnswersPayload): GradingResult {
  const feedback: AnswerFeedback[] = [];
  let autoScore = 0;
  let autoTotal = 0;
  let manualTotal = 0;

  document.blocks.forEach((block, blockIndex) => {
    if (!isGradableBlock(block)) return;
    const answer = answers[blockIndex];

    if (block.type === 'openResponse') {
      manualTotal += block.points;
      feedback.push({ blockIndex, correct: null, pointsAwarded: 0, pointsPossible: block.points });
      return;
    }

    autoTotal += block.points;
    let correct = false;
    switch (block.type) {
      case 'mcq':
        correct = typeof answer === 'number' && answer === block.correct;
        break;
      case 'checkbox': {
        const given = Array.isArray(answer) ? [...answer].sort() : null;
        const expected = [...block.correct].sort();
        correct =
          given !== null &&
          given.length === expected.length &&
          given.every((v, i) => v === expected[i]);
        break;
      }
      case 'truefalse':
        correct = typeof answer === 'boolean' && answer === block.correct;
        break;
      case 'shortAnswer':
        correct =
          typeof answer === 'string' &&
          block.accepted.some((accepted) => normalizeText(accepted) === normalizeText(answer));
        break;
      case 'numeric':
        correct = typeof answer === 'number' && Math.abs(answer - block.answer) <= block.tolerance;
        break;
    }

    const pointsAwarded = correct ? block.points : 0;
    autoScore += pointsAwarded;
    feedback.push({ blockIndex, correct, pointsAwarded, pointsPossible: block.points });
  });

  return {
    hasGradableBlocks: feedback.length > 0,
    autoScore,
    autoTotal,
    manualTotal,
    feedback,
  };
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}
