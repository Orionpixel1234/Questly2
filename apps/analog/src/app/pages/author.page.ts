import { Component } from '@angular/core';
import { defineRouteMeta } from '@analogjs/router';
import { authGuard } from '../core/guards/auth.guard';
import { roleGuard } from '../core/guards/role.guard';
import { LessonEditorComponent } from '../features/lesson-editor/lesson-editor.component';
import { GradingQueueComponent } from '../features/grading-queue/grading-queue.component';

export const routeMeta = defineRouteMeta({
  canActivate: [authGuard, roleGuard],
  data: { role: 'author' },
});

@Component({
  selector: 'app-author-page',
  imports: [LessonEditorComponent, GradingQueueComponent],
  template: `
    <div class="panel-page">
      <app-lesson-editor />
      <app-grading-queue />
    </div>
  `,
  styleUrls: ['./page-stub.css', './panel-page.css'],
})
export default class AuthorPageComponent {}
