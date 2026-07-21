import { Component } from '@angular/core';
import { defineRouteMeta } from '@analogjs/router';
import { authGuard } from '../core/guards/auth.guard';
import { roleGuard } from '../core/guards/role.guard';
import { LessonEditorComponent } from '../features/lesson-editor/lesson-editor.component';

export const routeMeta = defineRouteMeta({
  canActivate: [authGuard, roleGuard],
  data: { role: 'author' },
});

@Component({
  selector: 'app-author-page',
  imports: [LessonEditorComponent],
  template: `
    <div class="panel-page">
      <app-lesson-editor />
    </div>
  `,
  styleUrls: ['./page-stub.css', './panel-page.css'],
})
export default class AuthorPageComponent {}
