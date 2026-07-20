// Tracks position (with line/column, for error messages authors can act on)
// while scanning the source string. Used internally by parser.ts.
export class Cursor {
  pos = 0;
  line = 1;
  column = 1;

  constructor(private readonly source: string) {}

  eof(): boolean {
    return this.pos >= this.source.length;
  }

  peek(offset = 0): string {
    return this.source[this.pos + offset] ?? '';
  }

  startsWith(str: string): boolean {
    return this.source.startsWith(str, this.pos);
  }

  indexOf(str: string, from = this.pos): number {
    return this.source.indexOf(str, from);
  }

  slice(start: number, end: number): string {
    return this.source.slice(start, end);
  }

  advance(count = 1): void {
    for (let i = 0; i < count; i++) {
      if (this.eof()) return;
      if (this.source[this.pos] === '\n') {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
      this.pos++;
    }
  }

  // Advances the cursor to `target` (an absolute index >= current pos),
  // keeping line/column tracking correct across any newlines skipped.
  advanceTo(target: number): void {
    this.advance(target - this.pos);
  }

  skipWhitespace(): void {
    while (!this.eof() && /\s/.test(this.peek())) this.advance();
  }
}

export class ParseException extends Error {
  constructor(
    message: string,
    readonly line: number,
    readonly column: number,
  ) {
    super(message);
  }
}
