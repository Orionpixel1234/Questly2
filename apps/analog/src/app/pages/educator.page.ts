import { Component } from '@angular/core';

@Component({
  selector: 'app-educator-page',
  template: `
    <section class="panel page-stub">
      <span class="page-stub__eyebrow">Educator panel</span>
      <h1 class="page-stub__title">Educator</h1>
      <p class="page-stub__body">
        Class and roster management, grading, and feedback tools will live
        here.
      </p>
    </section>
  `,
  styleUrl: './page-stub.css',
})
export default class EducatorPageComponent {}
