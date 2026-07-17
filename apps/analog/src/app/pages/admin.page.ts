import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-page',
  template: `
    <section class="panel page-stub">
      <span class="page-stub__eyebrow">Admin panel</span>
      <h1 class="page-stub__title">Admin</h1>
      <p class="page-stub__body">
        User management, content moderation, and site configuration will
        live here.
      </p>
    </section>
  `,
  styleUrl: './page-stub.css',
})
export default class AdminPageComponent {}
