import { Component } from '@angular/core';

@Component({
  selector: 'app-student-page',
  template: `
    <section class="panel page-stub">
      <span class="page-stub__eyebrow">Student panel</span>
      <h1 class="page-stub__title">Student</h1>
      <p class="page-stub__body">
        Your dashboard, enrolled subjects, EXP/progress, and calendar will
        live here.
      </p>
    </section>
  `,
  styleUrl: './page-stub.css',
})
export default class StudentPageComponent {}
