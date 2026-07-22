# Lesson Markup Language

Questly lessons are authored in a small custom tag-based DSL (internal name:
**LessonML**). This document is the grammar spec — the source of truth the
parser (`libs/lesson-dsl`) and renderer (`apps/analog/.../lesson-renderer`)
both implement against.

A lesson's `content` is a plain UTF-8 string: a flat sequence of block
elements. There is no required root wrapper tag.

## Syntax shape

Block elements look like XML/JSX tags:

```
<Heading level="2">Newton's First Law</Heading>

<Text>
  An object at rest stays at rest, and an object in motion stays in
  motion, unless acted on by an outside force.
</Text>

<Math>F = ma</Math>
```

- Tags are `PascalCase`.
- Attributes are always `name="quoted string"` — no bare/unquoted values, no
  attribute shorthand. Either `"` or `'` may delimit the value (like JSX) so
  attributes carrying JSON (see `Molecule` below) don't need every internal
  `"` backslash-escaped; whichever quote character opens the value must
  close it, and that character can be escaped inside with `\"` / `\'`.
- Self-closing elements end in `/>`: `<Image src="..." alt="..." />`.
- Container elements have matching open/close tags: `<Text>...</Text>`.
- Comments: `<!-- like this -->`, ignored by the parser entirely.
- A literal `<` in prose text does **not** need escaping unless immediately
  followed by a letter or `/` (which would make it look like a tag). A
  standalone `<` (followed by space, digit, punctuation, or end of input) is
  treated as plain text, matching how real HTML/browsers behave — this
  keeps "if x < 10" writable without ceremony.

## Inline formatting

Pure custom tags for bold/italic/inline-code would make prose painful to
author, so **within the text content of `Text`, `Callout`, and `ListItem`**
(not inside `Code`, which is verbatim), a small Markdown-style inline syntax
is recognized:

| Syntax | Result |
|---|---|
| `**bold**` | **bold** |
| `*italic*` | *italic* |
| `` `code` `` | inline code |
| `[label](https://url)` | link |

This is intentionally the only place Markdown-style syntax appears — block
structure is 100% the custom tag grammar above. Nesting of inline styles
(e.g. bold inside italic) is not supported in v1.

## Block tags (v1)

### `<Heading level="1|2|3">text</Heading>`
Section heading. `level` is required.

### `<Text>...</Text>`
A paragraph. Content is inline-formatted per the table above.

### `<List type="ordered|unordered">` / `<Item>...</Item>`
```
<List type="unordered">
  <Item>First point</Item>
  <Item>Second point, with **emphasis**</Item>
</List>
```

### `<Callout type="info|warning|tip">...</Callout>`
A highlighted aside box. Content is inline-formatted like `Text`.

### `<Image src="..." alt="..." />`
Self-closing. `alt` is required (accessibility — the parser rejects a
missing `alt`).

### `<Math>...</Math>`
Block-level LaTeX, rendered with KaTeX. Content is the raw LaTeX source —
**not** inline-formatted (so `_` and `*`, common in LaTeX, aren't
misinterpreted as emphasis markers).

```
<Math>x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}</Math>
```

### `<MathGraph fn="..." xmin="-10" xmax="10" />`
Plots `y = fn(x)` on a canvas. `fn` is a small expression in `x` — evaluated
by a purpose-built safe evaluator (`libs/lesson-dsl`'s
`evaluateExpression`), **never** `eval`/`Function`. Supports
`+ - * / ^ ( )`, `sin cos tan sqrt abs log pow`, and the constants `pi`/`e`.
`xmin`/`xmax` default to `-10`/`10` if omitted.

```
<MathGraph fn="sin(x) * x" xmin="-6.5" xmax="6.5" />
```

### `<Molecule formula="..." />` or `<Molecule atoms="..." bonds="..." />`
Two modes:
- **Formula mode** (`formula="H2O"`): parses element/count pairs and draws
  them as a labeled cluster. This is a legibility aid, not a structurally
  accurate diagram — there's no positional/bonding information in a bare
  formula.
- **Structure mode** (`atoms`/`bonds` as JSON strings): accurate 2D layout.
  ```
  <Molecule
    atoms='[{"el":"O","x":0,"y":0},{"el":"H","x":-0.8,"y":0.6},{"el":"H","x":0.8,"y":0.6}]'
    bonds='[[0,1],[0,2]]'
  />
  ```
  `atoms[].el` is the element symbol; `x`/`y` are layout coordinates in an
  arbitrary local unit (the renderer auto-scales to fit). `bonds` is a list
  of `[atomIndexA, atomIndexB]` pairs.

Real cheminformatics (bond order, 3D, SMILES parsing) is out of scope for
v1 — this is a diagram aid, not a chemistry engine.

### `<Code lang="..." runnable="true|false">...</Code>`
Verbatim code block, content is **not** inline-formatted (no escaping needed
for `*`/`_`/backticks inside code). Syntax-highlighted via Prism if `lang`
is a language Prism recognizes. `runnable="true"` is only honored for
`lang="javascript"` in v1 — it renders a "Run" button that evaluates the
code in a sandboxed same-origin-restricted `<iframe>` (not `eval` in the
page's own context) and shows `console.log` output. Other languages render
highlighted but non-executable.

### `<Video src="..." />`
Self-closing. Embeds an HTML5 `<video>` player pointed at `src`.

### `<Hint>...</Hint>`
A collapsed-by-default aside the student expands on demand — same
inline-formatted content rules as `Text`/`Callout`, but framed as "click to
reveal" rather than always-visible.

### `<Divider />`
Self-closing, no attributes. A plain visual rule between sections.

### `<Summary>...</Summary>`
A styled recap paragraph, typically used at the end of a lesson. Inline-
formatted like `Text`.

## Quiz blocks (v2)

Six block types that turn a lesson into an assessment instead of just
reading material. Every quiz block requires `question` (a **plain string**
attribute — not inline-formatted; question text can't use `**bold**` etc in
v2) and `points` (its weight toward the lesson's score). Grading is done by
`libs/lesson-dsl`'s `gradeAnswers()` — the same pure function runs in the
Angular preview and the NestJS backend, so a student never sees a different
score client-side than what actually gets recorded.

Answers are keyed by **block index** — a block's position in the parsed
`document.blocks` array — not by any author-assigned id. There is no `id`
attribute in the grammar; this keeps authoring simple at the cost of an
answer technically being "for whichever block is at index N", which is fine
since editing a published lesson's content already forces it back to DRAFT
and a fresh review (see the lessons review workflow), so index drift under a
live lesson can't happen.

### `<MCQ question="..." correct="N" points="N">` / `<Option>...</Option>`
Single-select. `correct` is the **0-based index** into the `<Option>`
children. At least two options required.
```
<MCQ question="What is 2 + 2?" correct="1" points="10">
  <Option>3</Option>
  <Option>4</Option>
  <Option>5</Option>
</MCQ>
```

### `<Checkbox question="..." correct="[0,2]" points="N">` / `<Option>...</Option>`
Multi-select. `correct` is a JSON array of 0-based option indices; order
doesn't matter, but the selected set must match exactly.

### `<TrueFalse question="..." correct="true|false" points="N" />`
Self-closing.

### `<ShortAnswer question="..." accepted="ans1|ans2" points="N" />`
Self-closing. `accepted` is a `|`-separated list of acceptable answers,
matched case-insensitively with whitespace normalized (not fuzzy/substring
matching).

### `<Numeric question="..." answer="42" tolerance="0.5" points="N" />`
Self-closing. `tolerance` defaults to `0` (exact match) if omitted; the
submitted answer is accepted when `abs(submitted - answer) <= tolerance`.

### `<OpenResponse question="..." points="N" />`
Self-closing. **Never auto-graded** — always lands in the manual-grading
queue for an Author/Educator/Admin to score (see the grading endpoints).

## Validation

The parser rejects (with a line/col-anchored message, shown to the author
inline rather than silently dropped):
- Unknown tag names
- Mismatched/unclosed tags
- Missing required attributes (`Heading.level`, `Image.alt`, `List.type`,
  `Molecule` needing either `formula` or `atoms`+`bonds`, every quiz block's
  `question`/`points`, `MCQ`/`Checkbox`'s `correct`)
- Malformed `atoms`/`bonds` JSON on `Molecule`, malformed `correct` JSON on
  `Checkbox`
- `MCQ`/`Checkbox` with fewer than two `<Option>` children, or a `correct`
  index out of range

## Non-goals (v2)

- Nested inline formatting, tables, footnotes
- Rich (inline-formatted) question text — `question` is a plain string
- Real chemistry structure parsing (SMILES, bond order, 3D)
- Executing non-JavaScript code
- Partial credit on `Checkbox` (all-or-nothing per block)
