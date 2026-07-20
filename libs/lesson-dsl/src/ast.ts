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

export type LessonBlock =
  | HeadingBlock
  | TextBlock
  | ListBlock
  | CalloutBlock
  | ImageBlock
  | MathBlock
  | MathGraphBlock
  | MoleculeBlock
  | CodeBlock;

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
