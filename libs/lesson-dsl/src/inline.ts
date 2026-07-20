import type { InlineNode } from './ast.ts';

// Collapses author-formatted whitespace/indentation inside a prose block
// (Text/Callout/Item source) down to single spaces, so how the author wraps
// lines in the source doesn't leak into rendered spacing. Never applied to
// Math/Code, which are verbatim.
export function normalizeProseWhitespace(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

// Deliberately non-nesting (bold-inside-italic etc. isn't supported in v1 —
// see LESSON_DSL.md's Non-goals). An unmatched opening delimiter (no closing
// found) falls back to literal text rather than erroring, since prose is
// full of stray `*`/`` ` `` characters authors don't intend as markup.
export function parseInline(raw: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let i = 0;
  let textBuf = '';

  const flushText = () => {
    if (textBuf) {
      nodes.push({ type: 'text', text: textBuf });
      textBuf = '';
    }
  };

  while (i < raw.length) {
    if (raw.startsWith('**', i)) {
      const end = raw.indexOf('**', i + 2);
      if (end !== -1) {
        flushText();
        nodes.push({ type: 'bold', text: raw.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }

    if (raw[i] === '*') {
      const end = raw.indexOf('*', i + 1);
      if (end !== -1) {
        flushText();
        nodes.push({ type: 'italic', text: raw.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    if (raw[i] === '`') {
      const end = raw.indexOf('`', i + 1);
      if (end !== -1) {
        flushText();
        nodes.push({ type: 'code', text: raw.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    if (raw[i] === '[') {
      const closeBracket = raw.indexOf(']', i + 1);
      if (closeBracket !== -1 && raw[closeBracket + 1] === '(') {
        const closeParen = raw.indexOf(')', closeBracket + 2);
        if (closeParen !== -1) {
          flushText();
          nodes.push({
            type: 'link',
            text: raw.slice(i + 1, closeBracket),
            href: raw.slice(closeBracket + 2, closeParen),
          });
          i = closeParen + 1;
          continue;
        }
      }
    }

    textBuf += raw[i];
    i++;
  }

  flushText();
  return nodes;
}
