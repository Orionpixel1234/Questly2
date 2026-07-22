import { Component, input, output } from '@angular/core';
import type { AnswerFeedback, AnswerValue, LessonBlock } from '@questly/lesson-dsl';
import { InlineContentComponent } from './inline-content.component';
import { MathBlockComponent } from './math-block.component';
import { MathGraphBlockComponent } from './math-graph-block.component';
import { MoleculeBlockComponent } from './molecule-block.component';
import { CodeBlockComponent } from './code-block.component';
import { McqBlockComponent } from './mcq-block.component';
import { CheckboxBlockComponent } from './checkbox-block.component';
import { TrueFalseBlockComponent } from './truefalse-block.component';
import { ShortAnswerBlockComponent } from './short-answer-block.component';
import { NumericBlockComponent } from './numeric-block.component';
import { OpenResponseBlockComponent } from './open-response-block.component';

const CALLOUT_LABEL: Record<string, string> = {
  info: 'Info',
  warning: 'Warning',
  tip: 'Tip',
};

@Component({
  selector: 'app-lesson-block',
  imports: [
    InlineContentComponent,
    MathBlockComponent,
    MathGraphBlockComponent,
    MoleculeBlockComponent,
    CodeBlockComponent,
    McqBlockComponent,
    CheckboxBlockComponent,
    TrueFalseBlockComponent,
    ShortAnswerBlockComponent,
    NumericBlockComponent,
    OpenResponseBlockComponent,
  ],
  template: `
    @switch (block().type) {
      @case ('heading') {
        @let heading = asHeading();
        @switch (heading.level) {
          @case (1) {
            <h2 class="lesson-block__heading"><app-inline-content [nodes]="heading.children" /></h2>
          }
          @case (2) {
            <h3 class="lesson-block__heading"><app-inline-content [nodes]="heading.children" /></h3>
          }
          @default {
            <h4 class="lesson-block__heading"><app-inline-content [nodes]="heading.children" /></h4>
          }
        }
      }
      @case ('text') {
        <p class="lesson-block__text"><app-inline-content [nodes]="asText().children" /></p>
      }
      @case ('list') {
        @let list = asList();
        @if (list.ordered) {
          <ol class="lesson-block__list">
            @for (item of list.items; track $index) {
              <li><app-inline-content [nodes]="item.children" /></li>
            }
          </ol>
        } @else {
          <ul class="lesson-block__list">
            @for (item of list.items; track $index) {
              <li><app-inline-content [nodes]="item.children" /></li>
            }
          </ul>
        }
      }
      @case ('callout') {
        @let callout = asCallout();
        <div class="lesson-block__callout" [class]="'lesson-block__callout--' + callout.calloutType">
          <span class="lesson-block__callout-label">{{ calloutLabel(callout.calloutType) }}</span>
          <app-inline-content [nodes]="callout.children" />
        </div>
      }
      @case ('image') {
        @let image = asImage();
        <img class="lesson-block__image" [src]="image.src" [alt]="image.alt" loading="lazy" />
      }
      @case ('video') {
        <video class="lesson-block__image" [src]="asVideo().src" controls></video>
      }
      @case ('hint') {
        <details class="lesson-block__callout lesson-block__callout--info">
          <summary class="lesson-block__callout-label">Hint</summary>
          <app-inline-content [nodes]="asHint().children" />
        </details>
      }
      @case ('summary') {
        <div class="lesson-block__callout lesson-block__callout--tip">
          <span class="lesson-block__callout-label">Summary</span>
          <app-inline-content [nodes]="asSummary().children" />
        </div>
      }
      @case ('divider') {
        <hr class="lesson-block__divider" />
      }
      @case ('math') {
        <app-math-block [latex]="asMath().latex" />
      }
      @case ('mathGraph') {
        @let graph = asMathGraph();
        <app-math-graph-block [fn]="graph.fn" [xmin]="graph.xmin" [xmax]="graph.xmax" />
      }
      @case ('molecule') {
        <app-molecule-block [block]="asMolecule()" />
      }
      @case ('code') {
        @let code = asCode();
        <app-code-block [lang]="code.lang" [runnable]="code.runnable" [code]="code.code" />
      }
      @case ('mcq') {
        <app-mcq-block
          [block]="asMcq()"
          [answer]="$any(answer())"
          [feedback]="feedback()"
          [disabled]="disabled()"
          (answerChange)="answerChange.emit($event)"
        />
      }
      @case ('checkbox') {
        <app-checkbox-block
          [block]="asCheckbox()"
          [answer]="$any(answer())"
          [feedback]="feedback()"
          [disabled]="disabled()"
          (answerChange)="answerChange.emit($event)"
        />
      }
      @case ('truefalse') {
        <app-truefalse-block
          [block]="asTrueFalse()"
          [answer]="$any(answer())"
          [feedback]="feedback()"
          [disabled]="disabled()"
          (answerChange)="answerChange.emit($event)"
        />
      }
      @case ('shortAnswer') {
        <app-short-answer-block
          [block]="asShortAnswer()"
          [answer]="$any(answer())"
          [feedback]="feedback()"
          [disabled]="disabled()"
          (answerChange)="answerChange.emit($event)"
        />
      }
      @case ('numeric') {
        <app-numeric-block
          [block]="asNumeric()"
          [answer]="$any(answer())"
          [feedback]="feedback()"
          [disabled]="disabled()"
          (answerChange)="answerChange.emit($event)"
        />
      }
      @case ('openResponse') {
        <app-open-response-block
          [block]="asOpenResponse()"
          [answer]="$any(answer())"
          [feedback]="feedback()"
          [disabled]="disabled()"
          (answerChange)="answerChange.emit($event)"
        />
      }
    }
  `,
  styleUrl: './lesson-block.component.css',
})
export class LessonBlockComponent {
  readonly block = input.required<LessonBlock>();
  readonly answer = input<AnswerValue>();
  readonly feedback = input<AnswerFeedback>();
  readonly disabled = input(false);
  readonly answerChange = output<AnswerValue>();

  protected asHeading = () => this.block() as Extract<LessonBlock, { type: 'heading' }>;
  protected asText = () => this.block() as Extract<LessonBlock, { type: 'text' }>;
  protected asList = () => this.block() as Extract<LessonBlock, { type: 'list' }>;
  protected asCallout = () => this.block() as Extract<LessonBlock, { type: 'callout' }>;
  protected asImage = () => this.block() as Extract<LessonBlock, { type: 'image' }>;
  protected asVideo = () => this.block() as Extract<LessonBlock, { type: 'video' }>;
  protected asHint = () => this.block() as Extract<LessonBlock, { type: 'hint' }>;
  protected asSummary = () => this.block() as Extract<LessonBlock, { type: 'summary' }>;
  protected asMath = () => this.block() as Extract<LessonBlock, { type: 'math' }>;
  protected asMathGraph = () => this.block() as Extract<LessonBlock, { type: 'mathGraph' }>;
  protected asCode = () => this.block() as Extract<LessonBlock, { type: 'code' }>;
  protected asMolecule = () => this.block() as Extract<LessonBlock, { type: 'molecule' }>;
  protected asMcq = () => this.block() as Extract<LessonBlock, { type: 'mcq' }>;
  protected asCheckbox = () => this.block() as Extract<LessonBlock, { type: 'checkbox' }>;
  protected asTrueFalse = () => this.block() as Extract<LessonBlock, { type: 'truefalse' }>;
  protected asShortAnswer = () => this.block() as Extract<LessonBlock, { type: 'shortAnswer' }>;
  protected asNumeric = () => this.block() as Extract<LessonBlock, { type: 'numeric' }>;
  protected asOpenResponse = () => this.block() as Extract<LessonBlock, { type: 'openResponse' }>;

  protected calloutLabel(type: string): string {
    return CALLOUT_LABEL[type] ?? type;
  }
}
