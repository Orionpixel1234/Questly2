import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  template: `
    <section class="panel page-stub">
      <h1 class="page-stub__title">Questly</h1>
      <p class="page-stub__body">
        A space/satellite-themed learning platform — pick a panel to explore.
      </p>
      <nav class="page-stub__links">
        <a class="btn btn-secondary" routerLink="/admin">Admin</a>
        <a class="btn btn-secondary" routerLink="/author">Author</a>
        <a class="btn btn-secondary" routerLink="/student">Student</a>
        <a class="btn btn-secondary" routerLink="/educator">Educator</a>
      </nav>
    </section>
  `,
  styleUrl: './page-stub.css',
})
export default class HomePageComponent {}
