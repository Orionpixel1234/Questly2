import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  template: `
    <span
      class="skeleton"
      aria-hidden="true"
      [style.width]="width()"
      [style.height]="height()"
      [style.border-radius]="radius()"
    ></span>
  `,
  styleUrl: './skeleton.component.css',
})
export class SkeletonComponent {
  readonly width = input('100%');
  readonly height = input('1rem');
  readonly radius = input('0.375rem');
}
