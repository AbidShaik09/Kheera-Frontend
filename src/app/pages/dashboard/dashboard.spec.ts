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
    expect(textContent()).toContain('Recently Visited');
    expect(textContent()).toContain('Last Month Tasks');
    expect(textContent()).toContain('Earlier Tasks');
    expect(textContent()).toContain("Today's Focus");
  });

  it('does not present sample tasks as real user data', () => {
    const taskCards = fixture.nativeElement.querySelectorAll('app-home-task');

    expect(taskCards.length).toBe(0);
    expect(textContent()).toContain('Task history is coming soon');
  });

  it('shows an honest pending focus section', () => {
    expect(textContent()).toContain('Your focus list is coming soon');
  });

  function textContent(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
});
