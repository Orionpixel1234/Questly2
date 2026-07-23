import { TestBed } from '@angular/core/testing';
import { BombBlastGameComponent } from './bomb-blast-game.component';
import type { StudyQa } from './study-qa';

const QUESTIONS: StudyQa[] = [
  { q: '1+1', a: '2' },
  { q: '2+2', a: '4' },
];

describe('BombBlastGameComponent', () => {
  it('renders visible (non-dead) bricks for level 1 on first load', () => {
    const fixture = TestBed.createComponent(BombBlastGameComponent);
    fixture.componentRef.setInput('questions', QUESTIONS);
    fixture.detectChanges();

    const bricks: NodeListOf<HTMLButtonElement> =
      fixture.nativeElement.querySelectorAll('.brick');
    expect(bricks.length).toBeGreaterThan(0);

    const dead = fixture.nativeElement.querySelectorAll('.brick--dead');
    expect(dead.length).toBe(0);

    // "Block" (level 1) is a solid 5x8 rectangle.
    expect(bricks.length).toBe(40);

    const styles = getComputedStyle(bricks[0]);
    expect(styles.visibility).not.toBe('hidden');
  });
});
