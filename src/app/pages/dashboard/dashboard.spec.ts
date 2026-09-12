import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the dashboard section structure', () => {
    expect(textContent()).toContain('Activity');
    expect(textContent()).toContain('Favourites');
    expect(textContent()).toContain('Spaces');
    expect(textContent()).toContain('Recently Visited');
    expect(textContent()).toContain('Last Month Tasks');
    expect(textContent()).toContain('Earlier Tasks');
    expect(textContent()).toContain("Today's Focus");
  });

  it('renders task cards in the main dashboard sections', () => {
    const taskCards = fixture.nativeElement.querySelectorAll('app-home-task');

    expect(taskCards.length).toBe(7);
  });

  it('keeps the calendar as a placeholder for the standalone story', () => {
    expect(textContent()).toContain('Calendar');
    expect(textContent()).toContain('Coming soon');
  });

  function textContent(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
});
