// AST shape for LessonML — see LESSON_DSL.md at the repo root for the grammar
// this mirrors. Kept framework-agnostic (no Angular/DOM types) so it can be
// parsed and validated anywhere (browser preview, future server-side checks).

export type InlineNode =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'code'; text: string }
  | { type: 'link'; text: string; href: string };

export interface HeadingBlock {
  type: 'heading';
  level: 1 | 2 | 3;
  children: InlineNode[];
}

export interface TextBlock {
  type: 'text';
  children: InlineNode[];
}

export interface ListItemBlock {
  type: 'listItem';
  children: InlineNode[];
}

export interface ListBlock {
  type: 'list';
  ordered: boolean;
  items: ListItemBlock[];
}

export interface CalloutBlock {
  type: 'callout';
  calloutType: 'info' | 'warning' | 'tip';
  children: InlineNode[];
}

export interface ImageBlock {
  type: 'image';
  src: string;
  alt: string;
}

export interface MathBlock {
  type: 'math';
  latex: string;
}

export interface MathGraphBlock {
  type: 'mathGraph';
  fn: string;
  xmin: number;
  xmax: number;
}

export interface MoleculeAtom {
  el: string;
  x: number;
  y: number;
}

export type MoleculeBlock =
  | { type: 'molecule'; mode: 'formula'; formula: string }
  | {
      type: 'molecule';
      mode: 'structure';
      atoms: MoleculeAtom[];
      bonds: [number, number][];
    };

export interface CodeBlock {
  type: 'code';
  lang: string;
  runnable: boolean;
  code: string;
}

export interface VideoBlock {
  type: 'video';
  src: string;
}

export interface HintBlock {
  type: 'hint';
  children: InlineNode[];
}

export interface DividerBlock {
  type: 'divider';
}

export interface SummaryBlock {
  type: 'summary';
  children: InlineNode[];
}

export interface QuizOptionBlock {
  type: 'option';
  children: InlineNode[];
}

// Every gradable block carries `points` (its weight in autoTotal/manualTotal)
// and a plain-string `question` — deliberately not rich inline content, to
// keep the grading contract (see grading.ts) simple: one string prompt, one
// typed answer, no markup to reconcile between author and grader.
export interface McqBlock {
  type: 'mcq';
  question: string;
  options: QuizOptionBlock[];
  correct: number;
  points: number;
}

export interface CheckboxBlock {
  type: 'checkbox';
  question: string;
  options: QuizOptionBlock[];
  correct: number[];
  points: number;
}

export interface TrueFalseBlock {
  type: 'truefalse';
  question: string;
  correct: boolean;
  points: number;
}

export interface ShortAnswerBlock {
  type: 'shortAnswer';
  question: string;
  accepted: string[];
  points: number;
}

export interface NumericBlock {
  type: 'numeric';
  question: string;
  answer: number;
  tolerance: number;
  points: number;
}

// Never auto-graded — always routed to the manual-grading queue (see
// grading.ts and the api's ProgressService/LessonsService grading endpoints).
export interface OpenResponseBlock {
  type: 'openResponse';
  question: string;
  points: number;
}

export type GradableBlock =
  | McqBlock
  | CheckboxBlock
  | TrueFalseBlock
  | ShortAnswerBlock
  | NumericBlock
  | OpenResponseBlock;

export function isGradableBlock(block: LessonBlock): block is GradableBlock {
  return (
    block.type === 'mcq' ||
    block.type === 'checkbox' ||
    block.type === 'truefalse' ||
    block.type === 'shortAnswer' ||
    block.type === 'numeric' ||
    block.type === 'openResponse'
  );
}

export type LessonBlock =
  | HeadingBlock
  | TextBlock
  | ListBlock
  | CalloutBlock
  | ImageBlock
  | MathBlock
  | MathGraphBlock
  | MoleculeBlock
  | CodeBlock
  | VideoBlock
  | HintBlock
  | DividerBlock
  | SummaryBlock
  | McqBlock
  | CheckboxBlock
  | TrueFalseBlock
  | ShortAnswerBlock
  | NumericBlock
  | OpenResponseBlock;

export interface LessonDocument {
  blocks: LessonBlock[];
}

export interface LessonParseError {
  message: string;
  line: number;
  column: number;
}

export type LessonParseResult =
  | { ok: true; document: LessonDocument }
  | { ok: false; error: LessonParseError };
