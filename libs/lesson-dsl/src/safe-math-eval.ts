// A small, purpose-built expression evaluator for <MathGraph fn="..."/>.
// Deliberately NOT eval()/new Function() — the expression string comes from
// lesson authors (untrusted relative to a student's browser), so arbitrary
// JS execution is not an option. Grammar: + - * / ^ (right-assoc), unary
// minus, parens, the variable `x`, constants pi/e, and a small function
// whitelist (sin cos tan sqrt abs log pow).

type ExprNode =
  | { kind: 'number'; value: number }
  | { kind: 'variable' }
  | { kind: 'unary'; op: '-'; operand: ExprNode }
  | { kind: 'binary'; op: '+' | '-' | '*' | '/' | '^'; left: ExprNode; right: ExprNode }
  | { kind: 'call'; name: string; args: ExprNode[] };

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  log: Math.log,
  pow: Math.pow,
};

type Token =
  | { kind: 'number'; value: number }
  | { kind: 'ident'; name: string }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' | '^' | '(' | ')' | ',' };

export class ExpressionError extends Error {}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let raw = '';
      while (i < source.length && /[0-9.]/.test(source[i])) {
        raw += source[i];
        i++;
      }
      const value = Number(raw);
      if (Number.isNaN(value)) throw new ExpressionError(`Invalid number "${raw}"`);
      tokens.push({ kind: 'number', value });
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      let name = '';
      while (i < source.length && /[A-Za-z0-9]/.test(source[i])) {
        name += source[i];
        i++;
      }
      tokens.push({ kind: 'ident', name });
      continue;
    }
    if ('+-*/^(),'.includes(ch)) {
      tokens.push({ kind: 'op', value: ch as '+' | '-' | '*' | '/' | '^' | '(' | ')' | ',' });
      i++;
      continue;
    }
    throw new ExpressionError(`Unexpected character "${ch}" in expression`);
  }
  return tokens;
}

class ExpressionParser {
  private pos = 0;
  private readonly tokens: Token[];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private isOp(value: string): boolean {
    const t = this.peek();
    return !!t && t.kind === 'op' && t.value === value;
  }

  private consume(): Token {
    const t = this.tokens[this.pos];
    if (!t) throw new ExpressionError('Unexpected end of expression');
    this.pos++;
    return t;
  }

  parse(): ExprNode {
    const node = this.parseAdditive();
    if (this.pos < this.tokens.length) {
      throw new ExpressionError('Unexpected trailing input in expression');
    }
    return node;
  }

  private parseAdditive(): ExprNode {
    let node = this.parseMultiplicative();
    while (this.isOp('+') || this.isOp('-')) {
      const op = this.consume() as { kind: 'op'; value: '+' | '-' };
      node = { kind: 'binary', op: op.value, left: node, right: this.parseMultiplicative() };
    }
    return node;
  }

  private parseMultiplicative(): ExprNode {
    let node = this.parsePower();
    while (this.isOp('*') || this.isOp('/')) {
      const op = this.consume() as { kind: 'op'; value: '*' | '/' };
      node = { kind: 'binary', op: op.value, left: node, right: this.parsePower() };
    }
    return node;
  }

  private parsePower(): ExprNode {
    const node = this.parseUnary();
    if (this.isOp('^')) {
      this.consume();
      // right-associative: 2^3^2 === 2^(3^2)
      return { kind: 'binary', op: '^', left: node, right: this.parsePower() };
    }
    return node;
  }

  private parseUnary(): ExprNode {
    if (this.isOp('-')) {
      this.consume();
      return { kind: 'unary', op: '-', operand: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ExprNode {
    const t = this.consume();
    if (t.kind === 'number') return { kind: 'number', value: t.value };
    if (t.kind === 'op' && t.value === '(') {
      const inner = this.parseAdditive();
      if (!this.isOp(')')) throw new ExpressionError('Expected closing ")"');
      this.consume();
      return inner;
    }
    if (t.kind === 'ident') {
      if (t.name === 'x') return { kind: 'variable' };
      if (t.name in CONSTANTS) return { kind: 'number', value: CONSTANTS[t.name] };
      if (t.name in FUNCTIONS) {
        if (!this.isOp('(')) throw new ExpressionError(`Expected "(" after "${t.name}"`);
        this.consume();
        const args: ExprNode[] = [this.parseAdditive()];
        while (this.isOp(',')) {
          this.consume();
          args.push(this.parseAdditive());
        }
        if (!this.isOp(')')) throw new ExpressionError(`Expected ")" after "${t.name}(...)"`);
        this.consume();
        return { kind: 'call', name: t.name, args };
      }
      throw new ExpressionError(`Unknown identifier "${t.name}"`);
    }
    throw new ExpressionError('Unexpected token in expression');
  }
}

function evaluateNode(node: ExprNode, x: number): number {
  switch (node.kind) {
    case 'number':
      return node.value;
    case 'variable':
      return x;
    case 'unary':
      return -evaluateNode(node.operand, x);
    case 'binary': {
      const left = evaluateNode(node.left, x);
      const right = evaluateNode(node.right, x);
      switch (node.op) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          return left / right;
        case '^':
          return Math.pow(left, right);
      }
      break;
    }
    case 'call':
      return FUNCTIONS[node.name](...node.args.map((arg) => evaluateNode(arg, x)));
  }
}

// Parses once and returns a reusable evaluator — the intended API for
// MathGraph, which samples a function at hundreds of x values per render.
export function compileExpression(source: string): (x: number) => number {
  const ast = new ExpressionParser(tokenize(source)).parse();
  return (x: number) => evaluateNode(ast, x);
}
