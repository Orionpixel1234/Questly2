import { Component, OnDestroy, computed, input, output, signal } from '@angular/core';
import { GameShellComponent } from './game-shell.component';
import type { StudyQa } from './study-qa';
import { isAnswerCorrect } from './study-qa';
import { BOMB_BLAST_LEVELS, buildBombBlastLevel } from './bomb-blast-levels';

const LEVEL_SECONDS = 60;
const WRONG_LOCK_MS = 5000;
const TOTAL_LEVELS = BOMB_BLAST_LEVELS.length;

type Phase = 'play' | 'levelClear' | 'fail' | 'won';

@Component({
  selector: 'app-bomb-blast-game',
  imports: [GameShellComponent],
  template: `
    <app-game-shell title="Bomb Blast" [counter]="counter()" (exit)="exit.emit()">
      @if (phase() === 'won') {
        <div class="quiz-result quiz-result--win">
          <h3>Legend!</h3>
          <p>You demolished every wall. Best streak: {{ bestStreak() }}.</p>
          <button type="button" class="btn btn-primary" (click)="restartGame()">Play again</button>
        </div>
      } @else if (phase() === 'levelClear') {
        <div class="quiz-result quiz-result--win">
          <h3>Level {{ level() }} clear!</h3>
          <p>
            {{
              level() >= totalLevels
                ? 'Final wall down!'
                : 'Next up: level ' + (level() + 1) + ' — ' + nextLevelName()
            }}
          </p>
          <button type="button" class="btn btn-primary" (click)="nextLevel()">
            {{ level() >= totalLevels ? 'Finish' : 'Next level' }}
          </button>
        </div>
      } @else if (phase() === 'fail') {
        <div class="quiz-result quiz-result--lose">
          <h3>Out of time!</h3>
          <p>
            {{ bricksLeft() }} brick{{ bricksLeft() === 1 ? '' : 's' }} still standing. Restart
            level {{ level() }} and try again.
          </p>
          <button type="button" class="btn btn-primary" (click)="restartLevel()">
            Restart level {{ level() }}
          </button>
        </div>
      } @else {
        <div class="bomb-blast__grid">
          <div class="bomb-blast__question">
            <div class="quiz-timer" [class.quiz-timer--danger]="secondsLeft() <= 10">
              <span>Time</span>
              <span>0:{{ pad(secondsLeft()) }}</span>
            </div>
            <div
              class="panel quiz-question-card"
              [class.quiz-question-card--right]="feedback() === 'right'"
              [class.quiz-question-card--wrong]="feedback() === 'wrong'"
            >
              <p>{{ currentQuestion().q }}</p>
              <div class="quiz-question-card__row">
                <input
                  type="text"
                  [value]="answerText()"
                  [disabled]="feedback() !== null || locked()"
                  [placeholder]="locked() ? 'Locked · ' + lockSecondsLeft() + 's…' : 'Type your answer…'"
                  (input)="answerText.set($any($event.target).value)"
                  (keydown.enter)="check()"
                />
                <button type="button" class="btn btn-primary" [disabled]="feedback() !== null || locked()" (click)="check()">
                  Answer
                </button>
                <button type="button" class="btn btn-secondary" [disabled]="feedback() !== null || locked()" (click)="skip()">
                  Skip
                </button>
              </div>
              @if (feedback() === 'wrong') {
                <p class="quiz-feedback--wrong">
                  Not quite — locked {{ lockSecondsLeft() }}s. Correct answer:
                  {{ acceptedAnswersLabel() }}
                </p>
              }
              @if (feedback() === 'right') {
                <p class="quiz-feedback--right">+1 bomb!</p>
              }
            </div>
            <p class="mini-games__card-desc">
              1 minute per level. Correct answers earn bombs; wrong answers lock input for 5s.
            </p>
          </div>

          <div class="bomb-blast__wall-wrap">
            <p class="mini-games__card-desc" style="text-align:center">
              Level {{ level() }} · {{ levelName() }} · {{ bricksLeft() }} bricks
            </p>
            <div class="brick-wall" [style.grid-template-columns]="'repeat(' + cols() + ', minmax(0,1fr))'">
              @for (alive of wall(); track $index) {
                <button
                  type="button"
                  class="brick"
                  [class.brick--dead]="!alive"
                  [class.brick--locked]="bombs() === 0"
                  [disabled]="!alive || bombs() === 0"
                  [attr.aria-label]="'Brick ' + ($index + 1)"
                  (click)="detonate($index)"
                ></button>
              }
            </div>
            <p class="mini-games__card-desc" style="text-align:center">
              {{ bombs() === 0 ? 'Answer questions to earn bombs' : bombs() + ' bomb(s) — click a brick to blast' }}
            </p>
          </div>
        </div>
      }
    </app-game-shell>
  `,
  styleUrl: './mini-games.component.css',
})
export class BombBlastGameComponent implements OnDestroy {
  readonly questions = input.required<StudyQa[]>();
  readonly exit = output<void>();

  protected readonly totalLevels = TOTAL_LEVELS;
  protected readonly level = signal(1);
  protected readonly phase = signal<Phase>('play');
  protected readonly idx = signal(0);
  protected readonly bombs = signal(0);
  protected readonly streak = signal(0);
  protected readonly bestStreak = signal(0);
  protected readonly answerText = signal('');
  protected readonly feedback = signal<'right' | 'wrong' | null>(null);
  protected readonly lockUntil = signal(0);
  protected readonly wall = signal<boolean[]>([]);
  protected readonly cols = signal(1);
  protected readonly deadline = signal(0);
  protected readonly now = signal(Date.now());
  private tickHandle?: ReturnType<typeof setInterval>;

  protected readonly currentQuestion = computed(() => {
    const qs = this.questions();
    return qs[this.idx() % Math.max(1, qs.length)];
  });
  protected readonly secondsLeft = computed(() =>
    Math.max(0, Math.ceil((this.deadline() - this.now()) / 1000)),
  );
  protected readonly locked = computed(() => this.now() < this.lockUntil());
  protected readonly lockSecondsLeft = computed(() =>
    Math.max(0, Math.ceil((this.lockUntil() - this.now()) / 1000)),
  );
  protected readonly bricksLeft = computed(() => this.wall().filter(Boolean).length);
  protected readonly levelName = computed(() => BOMB_BLAST_LEVELS[this.level() - 1]?.name ?? '');
  protected readonly nextLevelName = computed(() => BOMB_BLAST_LEVELS[this.level()]?.name ?? '');
  protected readonly counter = computed(
    () => `Level ${this.level()}/${TOTAL_LEVELS} · bombs ${this.bombs()} · streak ${this.streak()} · best ${this.bestStreak()}`,
  );
  protected readonly acceptedAnswersLabel = computed(() => {
    const q = this.currentQuestion();
    return (q.answers && q.answers.length ? q.answers : [q.a]).join(', ');
  });

  constructor() {
    this.startLevel(1);
    this.tickHandle = setInterval(() => {
      if (this.phase() !== 'play') return;
      this.now.set(Date.now());
      if (this.secondsLeft() === 0) this.phase.set('fail');
    }, 200);
  }

  ngOnDestroy(): void {
    clearInterval(this.tickHandle);
  }

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  private startLevel(level: number): void {
    const built = buildBombBlastLevel(level);
    this.level.set(level);
    this.wall.set(built.wall);
    this.cols.set(built.cols);
    this.bombs.set(0);
    this.streak.set(0);
    this.answerText.set('');
    this.feedback.set(null);
    this.lockUntil.set(0);
    this.deadline.set(Date.now() + LEVEL_SECONDS * 1000);
    this.now.set(Date.now());
    this.phase.set('play');
  }

  protected restartLevel(): void {
    this.startLevel(this.level());
  }

  protected nextLevel(): void {
    if (this.level() >= TOTAL_LEVELS) this.phase.set('won');
    else this.startLevel(this.level() + 1);
  }

  protected restartGame(): void {
    this.bestStreak.set(0);
    this.startLevel(1);
  }

  protected check(): void {
    if (!this.answerText().trim() || this.locked() || this.feedback()) return;
    const correct = isAnswerCorrect(this.answerText(), this.currentQuestion());
    if (correct) {
      this.bombs.update((b) => b + 1);
      this.streak.update((s) => {
        const next = s + 1;
        this.bestStreak.update((best) => Math.max(best, next));
        return next;
      });
      this.feedback.set('right');
      setTimeout(() => {
        this.feedback.set(null);
        this.answerText.set('');
        this.idx.update((i) => (i + 1) % this.questions().length);
      }, 500);
    } else {
      this.streak.set(0);
      this.feedback.set('wrong');
      this.lockUntil.set(Date.now() + WRONG_LOCK_MS);
      setTimeout(() => {
        this.feedback.set(null);
        this.answerText.set('');
        this.idx.update((i) => (i + 1) % this.questions().length);
      }, WRONG_LOCK_MS);
    }
  }

  protected skip(): void {
    if (this.locked() || this.feedback()) return;
    this.streak.set(0);
    this.answerText.set('');
    this.idx.update((i) => (i + 1) % this.questions().length);
  }

  protected detonate(index: number): void {
    if (this.phase() !== 'play') return;
    const wall = this.wall();
    if (!wall[index] || this.bombs() === 0) return;
    const cols = this.cols();
    const rows = Math.ceil(wall.length / cols);
    const r = Math.floor(index / cols);
    const c = index % cols;
    const next = [...wall];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        next[nr * cols + nc] = false;
      }
    }
    this.wall.set(next);
    this.bombs.update((b) => b - 1);
    if (next.every((alive) => !alive)) {
      setTimeout(() => this.phase.set('levelClear'), 300);
    }
  }
}
