import { Component, HostListener, OnDestroy, computed, input, output, signal } from '@angular/core';
import { GameShellComponent } from './game-shell.component';
import type { StudyQa } from './study-qa';
import { isAnswerCorrect } from './study-qa';
import { makeJumpingJacksLevel } from './jumping-jacks-levels';

const ANSWER_SECONDS = 60;
const WRONG_LOCK_MS = 5000;
const TOTAL_LEVELS = 20;
const AIRBORNE_TILES = 2;

type Phase = 'answer' | 'play' | 'levelClear' | 'fail' | 'won';

@Component({
  selector: 'app-jumping-jacks-game',
  imports: [GameShellComponent],
  template: `
    <app-game-shell title="Jumping Jacks" [counter]="counter()" (exit)="exit.emit()">
      @if (phase() === 'won') {
        <div class="quiz-result quiz-result--win">
          <h3>Legendary hops!</h3>
          <p>You cleared all {{ totalLevels }} levels. Jumps left: {{ jumps() }}.</p>
          <button type="button" class="btn btn-primary" (click)="restartGame()">Play again</button>
        </div>
      } @else if (phase() === 'answer') {
        <div class="bomb-blast__question">
          <div class="quiz-timer" [class.quiz-timer--danger]="secondsLeft() <= 10">
            <span>Answer round</span>
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
                Not quite — locked {{ lockSecondsLeft() }}s. {{ acceptedAnswersLabel() }}
              </p>
            }
            @if (feedback() === 'right') {
              <p class="quiz-feedback--right">+1 jump!</p>
            }
          </div>
          <p class="mini-games__card-desc">
            60 seconds. Each correct answer = +1 jump. When time's up, platform through
            {{ totalLevels }} levels using your banked jumps.
          </p>
        </div>
      } @else {
        <div class="platform-track">
          <p class="mini-games__card-desc">
            Level {{ level() }} · {{ tiles().length - runnerX() - 1 }} tiles to go
          </p>
          <div class="platform-track__row" [style.grid-template-columns]="'repeat(' + tiles().length + ', minmax(0,1fr))'">
            @for (tile of tiles(); track $index) {
              <div class="platform-tile">
                @if ($index === runnerX()) {
                  <span class="platform-tile__runner" [class.platform-tile__runner--airborne]="airborne() > 0">
                    {{ failedTile() === $index ? '💥' : '🐰' }}
                  </span>
                }
                <div
                  class="platform-tile__ground"
                  [class.platform-tile__ground--gap]="tile === 'G'"
                  [class.platform-tile__ground--goal]="tile === 'F'"
                ></div>
              </div>
            }
          </div>

          @if (phase() === 'play') {
            <div class="jumping-jacks__actions">
              <p class="mini-games__card-desc">
                Press Space or tap Jump to leap gaps. Each jump costs 1 credit, keeps you airborne
                {{ airborneTiles }} tiles.
              </p>
              <button type="button" class="btn btn-primary" [disabled]="jumps() <= 0 || airborne() > 0" (click)="jump()">
                Jump ({{ jumps() }})
              </button>
            </div>
          } @else if (phase() === 'levelClear') {
            <div class="quiz-result quiz-result--win">
              <h3>Level {{ level() }} clear!</h3>
              <p>Jumps remaining: {{ jumps() }}. Next up: level {{ level() + 1 }}.</p>
              <button type="button" class="btn btn-primary" (click)="nextLevel()">Next level</button>
            </div>
          } @else if (phase() === 'fail') {
            <div class="quiz-result quiz-result--lose">
              <h3>Down the gap!</h3>
              <p>
                {{
                  jumps() > 0
                    ? 'You still have ' + jumps() + ' jump(s). Restart level ' + level() + '.'
                    : "You're out of jumps. Time to bank some more."
                }}
              </p>
              @if (jumps() > 0) {
                <button type="button" class="btn btn-primary" (click)="restartLevel()">
                  Restart level {{ level() }}
                </button>
              }
              <button type="button" class="btn btn-secondary" (click)="restartGame()">New answer round</button>
            </div>
          }
        </div>
      }
    </app-game-shell>
  `,
  styleUrl: './mini-games.component.css',
})
export class JumpingJacksGameComponent implements OnDestroy {
  readonly questions = input.required<StudyQa[]>();
  readonly exit = output<void>();

  protected readonly totalLevels = TOTAL_LEVELS;
  protected readonly airborneTiles = AIRBORNE_TILES;

  protected readonly phase = signal<Phase>('answer');
  protected readonly level = signal(1);
  protected readonly jumps = signal(0);
  protected readonly bestLevel = signal(1);

  protected readonly idx = signal(0);
  protected readonly answerText = signal('');
  protected readonly feedback = signal<'right' | 'wrong' | null>(null);
  protected readonly lockUntil = signal(0);
  protected readonly deadline = signal(Date.now() + ANSWER_SECONDS * 1000);
  protected readonly now = signal(Date.now());

  protected readonly track = signal(makeJumpingJacksLevel(1).track);
  protected readonly speedMs = signal(makeJumpingJacksLevel(1).speedMs);
  protected readonly pos = signal(0);
  protected readonly airborne = signal(0);
  protected readonly failedTile = signal<number | null>(null);

  private answerTickHandle?: ReturnType<typeof setInterval>;
  private playTickHandle?: ReturnType<typeof setInterval>;

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
  protected readonly tiles = computed(() => this.track().split(''));
  protected readonly runnerX = computed(() => Math.min(this.pos(), this.tiles().length - 1));
  protected readonly acceptedAnswersLabel = computed(() => {
    const q = this.currentQuestion();
    return (q.answers && q.answers.length ? q.answers : [q.a]).join(', ');
  });
  protected readonly counter = computed(() =>
    this.phase() === 'answer'
      ? `Jumps: ${this.jumps()}`
      : `Level ${this.level()}/${TOTAL_LEVELS} · jumps ${this.jumps()} · best L${this.bestLevel()}`,
  );

  constructor() {
    this.answerTickHandle = setInterval(() => {
      if (this.phase() !== 'answer') return;
      this.now.set(Date.now());
      if (this.secondsLeft() === 0) {
        if (this.jumps() === 0) this.jumps.set(1); // pity jump
        this.startLevel(1);
      }
    }, 200);
  }

  ngOnDestroy(): void {
    clearInterval(this.answerTickHandle);
    clearInterval(this.playTickHandle);
  }

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (this.phase() !== 'play') return;
    if (event.code === 'Space' || event.key === ' ') {
      event.preventDefault();
      this.jump();
    }
  }

  protected check(): void {
    if (!this.answerText().trim() || this.locked() || this.feedback()) return;
    const correct = isAnswerCorrect(this.answerText(), this.currentQuestion());
    if (correct) {
      this.jumps.update((j) => j + 1);
      this.feedback.set('right');
      setTimeout(() => {
        this.feedback.set(null);
        this.answerText.set('');
        this.idx.update((i) => (i + 1) % Math.max(1, this.questions().length));
      }, 400);
    } else {
      this.feedback.set('wrong');
      this.lockUntil.set(Date.now() + WRONG_LOCK_MS);
      setTimeout(() => {
        this.feedback.set(null);
        this.answerText.set('');
        this.idx.update((i) => (i + 1) % Math.max(1, this.questions().length));
      }, WRONG_LOCK_MS);
    }
  }

  protected skip(): void {
    if (this.locked() || this.feedback()) return;
    this.answerText.set('');
    this.idx.update((i) => (i + 1) % Math.max(1, this.questions().length));
  }

  private startLevel(level: number): void {
    const built = makeJumpingJacksLevel(level);
    this.level.set(level);
    this.track.set(built.track);
    this.speedMs.set(built.speedMs);
    this.pos.set(0);
    this.airborne.set(0);
    this.failedTile.set(null);
    this.phase.set('play');
    this.startPlayTicker();
  }

  private startPlayTicker(): void {
    clearInterval(this.playTickHandle);
    this.playTickHandle = setInterval(() => {
      if (this.phase() !== 'play') return;
      const nextPos = this.pos() + 1;
      if (nextPos >= this.tiles().length) {
        clearInterval(this.playTickHandle);
        return;
      }
      const tile = this.tiles()[nextPos];
      const wasAirborne = this.airborne() > 0;
      this.pos.set(nextPos);
      this.airborne.update((a) => Math.max(0, a - 1));

      if (tile === 'G' && !wasAirborne) {
        this.failedTile.set(nextPos);
        clearInterval(this.playTickHandle);
        setTimeout(() => this.phase.set('fail'), 350);
      } else if (tile === 'F') {
        this.bestLevel.update((b) => Math.max(b, this.level()));
        clearInterval(this.playTickHandle);
        setTimeout(() => {
          this.phase.set(this.level() >= TOTAL_LEVELS ? 'won' : 'levelClear');
        }, 250);
      }
    }, this.speedMs());
  }

  protected jump(): void {
    if (this.phase() !== 'play' || this.jumps() <= 0 || this.airborne() > 0) return;
    this.jumps.update((j) => j - 1);
    this.airborne.set(AIRBORNE_TILES);
  }

  protected restartLevel(): void {
    this.startLevel(this.level());
  }

  protected nextLevel(): void {
    this.startLevel(this.level() + 1);
  }

  protected restartGame(): void {
    clearInterval(this.playTickHandle);
    this.jumps.set(0);
    this.idx.set(0);
    this.answerText.set('');
    this.feedback.set(null);
    this.lockUntil.set(0);
    this.level.set(1);
    this.bestLevel.set(1);
    this.deadline.set(Date.now() + ANSWER_SECONDS * 1000);
    this.now.set(Date.now());
    this.phase.set('answer');
  }
}
