import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { defineRouteMeta } from '@analogjs/router';
import type { CalendarEvent } from '@questly/shared-types';
import { authGuard } from '../core/guards/auth.guard';
import { CalendarApiService } from '../core/api/calendar-api.service';
import { LoadingStateComponent } from '../shared/loading-state/loading-state.component';
import { ErrorStateComponent } from '../shared/error-state/error-state.component';

// No roleGuard — every role gets a personal calendar ("arrange your
// preferred classes in a neat organized calendar" from the product brief).
export const routeMeta = defineRouteMeta({
  canActivate: [authGuard],
});

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Monday-start week: Sunday (0) rolls back 6 days, otherwise back (day-1).
  const diff = day === 0 ? -6 : 1 - day;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff);
  return d;
}

@Component({
  selector: 'app-calendar-page',
  imports: [ReactiveFormsModule, LoadingStateComponent, ErrorStateComponent],
  template: `
    <div class="panel-page">
      <header class="panel-page__header">
        <div>
          <span class="page-stub__eyebrow">Calendar</span>
          <h1 class="page-stub__title" style="margin-bottom: 0">
            {{ weekLabel() }}
          </h1>
        </div>
        <div class="calendar-page__nav">
          <button type="button" class="btn btn-secondary" (click)="shiftWeek(-1)">‹ Prev</button>
          <button type="button" class="btn btn-secondary" (click)="goToday()">Today</button>
          <button type="button" class="btn btn-secondary" (click)="shiftWeek(1)">Next ›</button>
        </div>
      </header>

      <section class="panel panel-page__section">
        <h2 class="panel-page__heading">Schedule something</h2>
        <form [formGroup]="form" (ngSubmit)="createEvent()" class="inline-form">
          <label class="inline-form__field" style="flex: 1 1 12rem">
            <span>Title</span>
            <input type="text" formControlName="title" />
          </label>
          <label class="inline-form__field" style="flex: 1 1 8rem">
            <span>Subject</span>
            <input type="text" formControlName="subject" />
          </label>
          <label class="inline-form__field" style="flex: 1 1 10rem">
            <span>Start</span>
            <input type="datetime-local" formControlName="startTime" />
          </label>
          <label class="inline-form__field" style="flex: 1 1 10rem">
            <span>End</span>
            <input type="datetime-local" formControlName="endTime" />
          </label>
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid">
            Add to calendar
          </button>
        </form>
        @if (createError()) {
          <app-error-state [message]="createError()!" [showRetry]="false" />
        }
      </section>

      @if (loading()) {
        <app-loading-state label="Loading your calendar…" />
      } @else if (loadError()) {
        <app-error-state [message]="loadError()!" (retry)="load()" />
      } @else {
        <div class="calendar-page__week">
          @for (day of weekDays(); track day.iso) {
            <div class="calendar-page__day" [class.calendar-page__day--today]="day.isToday">
              <span class="calendar-page__day-label">{{ day.label }}</span>
              @if (eventsFor(day.iso).length === 0) {
                <p class="calendar-page__empty">—</p>
              } @else {
                <ul class="calendar-page__events">
                  @for (event of eventsFor(day.iso); track event.id) {
                    <li class="calendar-page__event">
                      <div class="calendar-page__event-time">
                        {{ formatTime(event.startTime) }}–{{ formatTime(event.endTime) }}
                      </div>
                      <div class="calendar-page__event-title">{{ event.title }}</div>
                      @if (event.subject) {
                        <span class="badge">{{ event.subject }}</span>
                      }
                      <button
                        type="button"
                        class="calendar-page__event-remove"
                        (click)="removeEvent(event.id)"
                        aria-label="Remove event"
                      >
                        ×
                      </button>
                    </li>
                  }
                </ul>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrls: ['./page-stub.css', './panel-page.css', './calendar.page.css'],
})
export default class CalendarPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly calendarApi = inject(CalendarApiService);

  protected readonly weekStart = signal(startOfWeek(new Date()));
  protected readonly events = signal<CalendarEvent[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly createError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    subject: [''],
    startTime: ['', Validators.required],
    endTime: ['', Validators.required],
  });

  protected readonly weekLabel = computed(() => {
    const start = this.weekStart();
    const end = new Date(start.getTime() + 6 * DAY_MS);
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
  });

  protected readonly weekDays = computed(() => {
    const start = this.weekStart();
    const today = new Date().toDateString();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start.getTime() + i * DAY_MS);
      return {
        iso: date.toDateString(),
        label: date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }),
        isToday: date.toDateString() === today,
      };
    });
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.calendarApi.mine().subscribe({
      next: (events) => {
        this.events.set(events);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load your calendar.');
        this.loading.set(false);
      },
    });
  }

  protected eventsFor(iso: string): CalendarEvent[] {
    return this.events()
      .filter((event) => new Date(event.startTime).toDateString() === iso)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  protected shiftWeek(direction: -1 | 1): void {
    this.weekStart.set(new Date(this.weekStart().getTime() + direction * 7 * DAY_MS));
  }

  protected goToday(): void {
    this.weekStart.set(startOfWeek(new Date()));
  }

  protected formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  protected createEvent(): void {
    if (this.form.invalid) return;
    this.createError.set(null);
    const raw = this.form.getRawValue();
    this.calendarApi
      .create({
        title: raw.title,
        subject: raw.subject || undefined,
        startTime: new Date(raw.startTime).toISOString(),
        endTime: new Date(raw.endTime).toISOString(),
      })
      .subscribe({
        next: () => {
          this.form.reset({ title: '', subject: '', startTime: '', endTime: '' });
          this.load();
        },
        error: () => this.createError.set('Could not create that event.'),
      });
  }

  protected removeEvent(id: string): void {
    this.calendarApi.remove(id).subscribe(() => this.load());
  }
}
