import type { InlineNode, LessonBlock, LessonDocument } from './ast.ts';

// Powers "call mode" — audio-first lesson playback (see LESSON_DSL.md's
// scope note: Math/MathGraph/Molecule/Code are visual by nature and skipped
// here rather than read as gibberish LaTeX/source). One string per spoken
// segment, in document order, so the player can highlight/navigate them.
export function extractSpeechSegments(document: LessonDocument): string[] {
  const segments: string[] = [];
  for (const block of document.blocks) {
    segments.push(...segmentsForBlock(block));
  }
  return segments.filter((segment) => segment.trim().length > 0);
}

function segmentsForBlock(block: LessonBlock): string[] {
  switch (block.type) {
    case 'heading':
      return [inlineToText(block.children)];
    case 'text':
      return [inlineToText(block.children)];
    case 'callout': {
      const label = block.calloutType === 'tip' ? 'Tip' : block.calloutType === 'warning' ? 'Warning' : 'Note';
      return [`${label}: ${inlineToText(block.children)}`];
    }
    case 'list':
      return block.items.map((item) => inlineToText(item.children));
    case 'hint':
      return [`Hint: ${inlineToText(block.children)}`];
    case 'summary':
      return [inlineToText(block.children)];
    case 'mcq':
    case 'checkbox':
    case 'truefalse':
    case 'shortAnswer':
    case 'numeric':
    case 'openResponse':
      return [`Question: ${block.question}`];
    case 'image':
    case 'video':
    case 'divider':
    case 'math':
    case 'mathGraph':
    case 'molecule':
    case 'code':
      return [];
  }
}

function inlineToText(nodes: InlineNode[]): string {
  return nodes.map((node) => node.text).join('');
}
