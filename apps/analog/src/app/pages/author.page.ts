import { Component } from '@angular/core';

@Component({
  selector: 'app-author-page',
  template: `
    <section class="panel page-stub">
      <span class="page-stub__eyebrow">Author panel</span>
      <h1 class="page-stub__title">Author</h1>
      <p class="page-stub__body">
        The lesson authoring workspace — math, science, and code content in
        Questly's markup language — will live here.
      </p>
    </section>
  `,
  styleUrl: './page-stub.css',
})
export default class AuthorPageComponent {}
