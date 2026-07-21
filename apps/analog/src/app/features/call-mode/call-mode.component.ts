import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { extractSpeechSegments, parseLesson } from '@questly/lesson-dsl';

// "You can also take lessons when your driving, eating, etc. You can treat
// it like a call." — hands-free, audio-only playback via the browser's
// built-in speech synthesis (no external TTS API/key needed). Rendered as a
// full-screen overlay so it reads like an active call, not an inline panel.
@Component({
  selector: 'app-call-mode',
  template: `
    <div
      #dialog
      class="call-mode"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      [attr.aria-label]="'Call: ' + title()"
    >
      <div class="call-mode__avatar" [class.call-mode__avatar--speaking]="speaking()"></div>
      <p class="call-mode__title">{{ title() }}</p>
      <p class="call-mode__status">
        @if (segments().length === 0) {
          Nothing to read in this lesson.
        } @else if (finished()) {
          Lesson complete.
        } @else {
          Segment {{ currentIndex() + 1 }} of {{ segments().length }}
        }
      </p>
      <p class="call-mode__caption">{{ currentSegment() }}</p>

      <div class="call-mode__controls">
        <button
          type="button"
          class="call-mode__button"
          (click)="previous()"
          [disabled]="currentIndex() === 0"
          aria-label="Previous"
        >
          ⏮
        </button>
        <button
          type="button"
          class="call-mode__button call-mode__button--primary"
          (click)="togglePlay()"
          [disabled]="segments().length === 0"
          [attr.aria-label]="speaking() ? 'Pause' : 'Play'"
        >
          {{ speaking() ? '⏸' : '▶' }}
        </button>
        <button
          type="button"
          class="call-mode__button"
          (click)="next()"
          [disabled]="currentIndex() >= segments().length - 1"
          aria-label="Next"
        >
          ⏭
        </button>
      </div>

      <button type="button" class="call-mode__end" (click)="endCall()">End call</button>
    </div>
  `,
  styleUrl: './call-mode.component.css',
})
export class CallModeComponent {
  readonly source = input.required<string>();
  readonly title = input.required<string>();
  readonly closed = output<void>();

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = viewChild<ElementRef<HTMLElement>>('dialog');

  // computed, not eager construction — `source` is a required input and
  // isn't bound yet when this class's constructor body runs.
  protected readonly segments = computed<string[]>(() => {
    const result = parseLesson(this.source());
    return result.ok ? extractSpeechSegments(result.document) : [];
  });
  protected readonly currentIndex = signal(0);
  protected readonly speaking = signal(false);
  protected readonly finished = signal(false);

  protected readonly currentSegment = () => this.segments()[this.currentIndex()] ?? '';

  constructor() {
    afterNextRender(() => {
      this.dialogRef()?.nativeElement.focus();
      if (this.isBrowser && this.segments().length > 0) this.speak(0);
    });

    this.destroyRef.onDestroy(() => {
      if (this.isBrowser) window.speechSynthesis.cancel();
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.endCall();
  }

  private speak(index: number): void {
    if (!this.isBrowser || index >= this.segments().length) {
      this.speaking.set(false);
      this.finished.set(index >= this.segments().length);
      return;
    }
    window.speechSynthesis.cancel();
    this.currentIndex.set(index);
    this.finished.set(false);
    const utterance = new SpeechSynthesisUtterance(this.segments()[index]);
    utterance.onend = () => {
      if (this.currentIndex() === index) this.speak(index + 1);
    };
    utterance.onerror = () => this.speaking.set(false);
    this.speaking.set(true);
    window.speechSynthesis.speak(utterance);
  }

  protected togglePlay(): void {
    if (!this.isBrowser) return;
    if (this.speaking()) {
      window.speechSynthesis.pause();
      this.speaking.set(false);
    } else if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      this.speaking.set(true);
    } else {
      this.speak(this.finished() ? 0 : this.currentIndex());
    }
  }

  protected next(): void {
    this.speak(this.currentIndex() + 1);
  }

  protected previous(): void {
    this.speak(Math.max(0, this.currentIndex() - 1));
  }

  protected endCall(): void {
    if (this.isBrowser) window.speechSynthesis.cancel();
    this.closed.emit();
  }
}
