import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { WorkspaceShell } from './workspace-shell';
import { WorkspaceService, WorkspaceState } from '../../services/workspace-service';
import { AuthService } from '../../services/auth-service';

describe('WorkspaceShell', () => {
  const state = signal<WorkspaceState>({ status: 'ready', spaces: [], message: null });
  beforeEach(() => {
    state.set({ status: 'ready', spaces: [], message: null });
    TestBed.configureTestingModule({
      imports: [WorkspaceShell],
      providers: [
        provideRouter([]),
        {
          provide: WorkspaceService,
          useValue: { state, refresh: vi.fn().mockResolvedValue(undefined) },
        },
        {
          provide: AuthService,
          useValue: { isUserLoggedIn: signal(true), sessionEpoch: signal(1) },
        },
      ],
    });
  });
  async function render() {
    const fixture = TestBed.createComponent(WorkspaceShell);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }
  it('renders genuine no-spaces onboarding without fake counts', async () => {
    const fixture = await render();
    expect(fixture.nativeElement.textContent).toContain('No spaces yet');
    expect(fixture.nativeElement.textContent).not.toContain('6 projects');
    expect(fixture.nativeElement.querySelector('button[disabled]')?.textContent).toContain(
      'Create space',
    );
  });
  it('provides a loading status and explicit unavailable favourites/activity', async () => {
    state.set({ status: 'loading', spaces: [], message: null });
    const fixture = await render();
    expect(fixture.nativeElement.textContent).toContain('Loading spaces');
    expect(fixture.nativeElement.textContent).toContain('Favourites are coming soon');
    expect(fixture.nativeElement.textContent).toContain('Activity is coming soon');
  });
  it('offers retry when spaces fail to load', async () => {
    state.set({ status: 'error', spaces: [], message: 'Unable to load spaces.' });
    const fixture = await render();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Unable to load spaces.',
    );
    const button = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((x) => x.textContent?.includes('Refresh spaces'));
    expect(button).toBeDefined();
    button!.click();
    expect(TestBed.inject(WorkspaceService).refresh).toHaveBeenCalled();
  });
});
