import type {
  CalloutBlock,
  CodeBlock,
  HeadingBlock,
  ImageBlock,
  LessonBlock,
  LessonDocument,
  LessonParseResult,
  ListBlock,
  ListItemBlock,
  MathBlock,
  MathGraphBlock,
  MoleculeAtom,
  MoleculeBlock,
  TextBlock,
} from './ast.ts';
import { Cursor, ParseException } from './cursor.ts';
import { normalizeProseWhitespace, parseInline } from './inline.ts';

// Tags with no children, self-closing only (`<Tag ... />`).
const VOID_TAGS = new Set(['Image', 'MathGraph', 'Molecule']);
// Tags whose content is raw/verbatim (not inline-formatted, no nested tags).
const RAW_TAGS = new Set(['Math', 'Code']);
// Tags whose content is inline-formatted prose (no nested block tags).
// Item is deliberately not here — it's only ever reached via parseItemElement
// (inside <List>), never through the generic block dispatcher.
const INLINE_TAGS = new Set(['Heading', 'Text', 'Callout']);
const KNOWN_TAGS = new Set([
  'Heading',
  'Text',
  'List',
  'Item',
  'Callout',
  'Image',
  'Math',
  'MathGraph',
  'Molecule',
  'Code',
]);

export function parseLesson(source: string): LessonParseResult {
  const cursor = new Cursor(source);
  try {
    const blocks = parseBlocks(cursor, null);
    cursor.skipWhitespace();
    if (!cursor.eof()) {
      throw new ParseException(
        `Unexpected content at the top level: "${cursor.peek()}"`,
        cursor.line,
        cursor.column,
      );
    }
    return { ok: true, document: { blocks } };
  } catch (e) {
    if (e instanceof ParseException) {
      return { ok: false, error: { message: e.message, line: e.line, column: e.column } };
    }
    throw e;
  }
}

function parseBlocks(cursor: Cursor, stopTag: string | null): LessonBlock[] {
  const blocks: LessonBlock[] = [];
  for (;;) {
    skipWhitespaceAndComments(cursor);
    if (cursor.eof()) {
      if (stopTag) {
        throw new ParseException(`Unclosed <${stopTag}>`, cursor.line, cursor.column);
      }
      return blocks;
    }
    if (stopTag && cursor.startsWith(`</${stopTag}>`)) {
      return blocks;
    }
    if (cursor.startsWith('</')) {
      throw new ParseException(
        `Unexpected closing tag here (no matching open tag)`,
        cursor.line,
        cursor.column,
      );
    }
    if (cursor.peek() !== '<' || !/[A-Za-z]/.test(cursor.peek(1))) {
      throw new ParseException(
        `Expected a block tag (like <Text> or <Heading>) here, found "${cursor.peek()}"`,
        cursor.line,
        cursor.column,
      );
    }
    blocks.push(parseBlockElement(cursor));
  }
}

function skipWhitespaceAndComments(cursor: Cursor): void {
  for (;;) {
    cursor.skipWhitespace();
    if (cursor.startsWith('<!--')) {
      const end = cursor.indexOf('-->');
      if (end === -1) throw new ParseException('Unclosed comment', cursor.line, cursor.column);
      cursor.advanceTo(end + 3);
      continue;
    }
    return;
  }
}

function parseBlockElement(cursor: Cursor): LessonBlock {
  const startLine = cursor.line;
  const startColumn = cursor.column;
  cursor.advance(); // '<'
  const tagName = readIdentifier(cursor);
  if (!KNOWN_TAGS.has(tagName)) {
    throw new ParseException(`Unknown tag <${tagName}>`, startLine, startColumn);
  }
  if (tagName === 'Item') {
    throw new ParseException('<Item> may only appear inside <List>', startLine, startColumn);
  }
  const attrs = parseAttributes(cursor);

  if (VOID_TAGS.has(tagName)) {
    cursor.skipWhitespace();
    if (!cursor.startsWith('/>')) {
      throw new ParseException(
        `<${tagName}> is a self-closing tag — expected "/>" `,
        cursor.line,
        cursor.column,
      );
    }
    cursor.advance(2);
    return buildVoidBlock(tagName, attrs, startLine, startColumn);
  }

  cursor.skipWhitespace();
  if (!cursor.startsWith('>')) {
    throw new ParseException(`Expected ">" to close <${tagName}>`, cursor.line, cursor.column);
  }
  cursor.advance();

  if (tagName === 'List') {
    const items = parseListItems(cursor);
    expectClose(cursor, 'List');
    const ordered = requireAttr(attrs, 'type', 'List', startLine, startColumn);
    if (ordered !== 'ordered' && ordered !== 'unordered') {
      throw new ParseException(
        `<List type="..."> must be "ordered" or "unordered", got "${ordered}"`,
        startLine,
        startColumn,
      );
    }
    const block: ListBlock = { type: 'list', ordered: ordered === 'ordered', items };
    return block;
  }

  if (RAW_TAGS.has(tagName)) {
    const closeSeq = `</${tagName}>`;
    const end = cursor.indexOf(closeSeq);
    if (end === -1) {
      throw new ParseException(`Unclosed <${tagName}>`, startLine, startColumn);
    }
    const rawStart = cursor.pos;
    cursor.advanceTo(end);
    const raw = cursor.slice(rawStart, end);
    cursor.advance(closeSeq.length);
    return buildRawBlock(tagName, attrs, raw, startLine, startColumn);
  }

  if (INLINE_TAGS.has(tagName)) {
    const closeSeq = `</${tagName}>`;
    const end = cursor.indexOf(closeSeq);
    if (end === -1) {
      throw new ParseException(`Unclosed <${tagName}>`, startLine, startColumn);
    }
    const rawStart = cursor.pos;
    cursor.advanceTo(end);
    const raw = cursor.slice(rawStart, end);
    cursor.advance(closeSeq.length);
    const children = parseInline(normalizeProseWhitespace(raw));
    return buildInlineBlock(tagName, attrs, children, startLine, startColumn);
  }

  throw new ParseException(`<${tagName}> cannot appear here`, startLine, startColumn);
}

function parseListItems(cursor: Cursor): ListItemBlock[] {
  const items: ListItemBlock[] = [];
  for (;;) {
    skipWhitespaceAndComments(cursor);
    if (cursor.startsWith('</List>')) return items;
    if (!cursor.startsWith('<Item')) {
      throw new ParseException(
        '<List> may only contain <Item> elements',
        cursor.line,
        cursor.column,
      );
    }
    items.push(parseItemElement(cursor));
  }
}

function parseItemElement(cursor: Cursor): ListItemBlock {
  const startLine = cursor.line;
  const startColumn = cursor.column;
  cursor.advance(); // '<'
  readIdentifier(cursor); // 'Item', already confirmed by the caller's startsWith check
  parseAttributes(cursor); // Item takes no attributes; parsed only to skip past any stray ones
  cursor.skipWhitespace();
  if (!cursor.startsWith('>')) {
    throw new ParseException('Expected ">" to close <Item>', cursor.line, cursor.column);
  }
  cursor.advance();
  const closeSeq = '</Item>';
  const end = cursor.indexOf(closeSeq);
  if (end === -1) {
    throw new ParseException('Unclosed <Item>', startLine, startColumn);
  }
  const rawStart = cursor.pos;
  cursor.advanceTo(end);
  const raw = cursor.slice(rawStart, end);
  cursor.advance(closeSeq.length);
  return { type: 'listItem', children: parseInline(normalizeProseWhitespace(raw)) };
}

function readIdentifier(cursor: Cursor): string {
  let name = '';
  while (!cursor.eof() && /[A-Za-z0-9]/.test(cursor.peek())) {
    name += cursor.peek();
    cursor.advance();
  }
  return name;
}

function parseAttributes(cursor: Cursor): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (;;) {
    cursor.skipWhitespace();
    if (cursor.startsWith('/>') || cursor.startsWith('>') || cursor.eof()) return attrs;
    const name = readIdentifier(cursor);
    if (!name) {
      throw new ParseException('Expected an attribute name', cursor.line, cursor.column);
    }
    cursor.skipWhitespace();
    if (!cursor.startsWith('=')) {
      throw new ParseException(
        `Expected '="value"' after attribute "${name}"`,
        cursor.line,
        cursor.column,
      );
    }
    cursor.advance();
    cursor.skipWhitespace();
    // Both quote styles are accepted (like JSX) specifically so attributes
    // carrying JSON (Molecule's atoms/bonds) can use "..." internally
    // without every character needing a backslash.
    const quote = cursor.peek();
    if (quote !== '"' && quote !== "'") {
      throw new ParseException(
        `Attribute values must be quoted (got attribute "${name}")`,
        cursor.line,
        cursor.column,
      );
    }
    cursor.advance();
    let value = '';
    while (!cursor.eof() && cursor.peek() !== quote) {
      if (cursor.peek() === '\\' && cursor.peek(1) === quote) {
        value += quote;
        cursor.advance(2);
        continue;
      }
      value += cursor.peek();
      cursor.advance();
    }
    if (cursor.eof()) {
      throw new ParseException(`Unclosed attribute value for "${name}"`, cursor.line, cursor.column);
    }
    cursor.advance(); // closing '"'
    attrs[name] = value;
  }
}

function expectClose(cursor: Cursor, tagName: string): void {
  const closeSeq = `</${tagName}>`;
  if (!cursor.startsWith(closeSeq)) {
    throw new ParseException(`Expected "${closeSeq}"`, cursor.line, cursor.column);
  }
  cursor.advance(closeSeq.length);
}

function requireAttr(
  attrs: Record<string, string>,
  name: string,
  tagName: string,
  line: number,
  column: number,
): string {
  const value = attrs[name];
  if (value === undefined) {
    throw new ParseException(`<${tagName}> is missing required attribute "${name}"`, line, column);
  }
  return value;
}

function requireNumberAttr(
  attrs: Record<string, string>,
  name: string,
  fallback: number,
  tagName: string,
  line: number,
  column: number,
): number {
  const raw = attrs[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (Number.isNaN(value)) {
    throw new ParseException(
      `<${tagName}> attribute "${name}" must be a number, got "${raw}"`,
      line,
      column,
    );
  }
  return value;
}

function buildInlineBlock(
  tagName: string,
  attrs: Record<string, string>,
  children: ReturnType<typeof parseInline>,
  line: number,
  column: number,
): HeadingBlock | TextBlock | CalloutBlock {
  switch (tagName) {
    case 'Heading': {
      const levelRaw = requireAttr(attrs, 'level', 'Heading', line, column);
      const level = Number(levelRaw);
      if (level !== 1 && level !== 2 && level !== 3) {
        throw new ParseException(
          `<Heading level="..."> must be "1", "2", or "3", got "${levelRaw}"`,
          line,
          column,
        );
      }
      return { type: 'heading', level, children };
    }
    case 'Text':
      return { type: 'text', children };
    case 'Callout': {
      const calloutType = requireAttr(attrs, 'type', 'Callout', line, column);
      if (calloutType !== 'info' && calloutType !== 'warning' && calloutType !== 'tip') {
        throw new ParseException(
          `<Callout type="..."> must be "info", "warning", or "tip", got "${calloutType}"`,
          line,
          column,
        );
      }
      return { type: 'callout', calloutType, children };
    }
    default:
      throw new ParseException(`<${tagName}> cannot appear here`, line, column);
  }
}

function buildRawBlock(
  tagName: string,
  attrs: Record<string, string>,
  raw: string,
  line: number,
  column: number,
): MathBlock | CodeBlock {
  if (tagName === 'Math') {
    return { type: 'math', latex: raw.trim() };
  }
  const lang = attrs['lang'] ?? 'text';
  const runnable = attrs['runnable'] === 'true';
  // Strip exactly one leading/trailing newline (common when authors put the
  // opening tag on its own line) without touching internal indentation,
  // which is significant in code.
  const code = raw.replace(/^\n/, '').replace(/\n$/, '');
  return { type: 'code', lang, runnable, code };
}

function buildVoidBlock(
  tagName: string,
  attrs: Record<string, string>,
  line: number,
  column: number,
): ImageBlock | MathGraphBlock | MoleculeBlock {
  if (tagName === 'Image') {
    return {
      type: 'image',
      src: requireAttr(attrs, 'src', 'Image', line, column),
      alt: requireAttr(attrs, 'alt', 'Image', line, column),
    };
  }
  if (tagName === 'MathGraph') {
    return {
      type: 'mathGraph',
      fn: requireAttr(attrs, 'fn', 'MathGraph', line, column),
      xmin: requireNumberAttr(attrs, 'xmin', -10, 'MathGraph', line, column),
      xmax: requireNumberAttr(attrs, 'xmax', 10, 'MathGraph', line, column),
    };
  }
  // Molecule
  if (attrs['formula'] !== undefined) {
    return { type: 'molecule', mode: 'formula', formula: attrs['formula'] };
  }
  if (attrs['atoms'] !== undefined && attrs['bonds'] !== undefined) {
    let atoms: MoleculeAtom[];
    let bonds: [number, number][];
    try {
      atoms = JSON.parse(attrs['atoms']);
      bonds = JSON.parse(attrs['bonds']);
    } catch {
      throw new ParseException(
        '<Molecule> "atoms"/"bonds" must be valid JSON',
        line,
        column,
      );
    }
    return { type: 'molecule', mode: 'structure', atoms, bonds };
  }
  throw new ParseException(
    '<Molecule> needs either "formula" or both "atoms" and "bonds"',
    line,
    column,
  );
}

export type { LessonDocument } from './ast.ts';
