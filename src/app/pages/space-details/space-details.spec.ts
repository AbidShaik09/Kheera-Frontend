import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { SpaceDetails } from './space-details';
import { SpaceDetailService, safeImageUrl } from '../../services/space-detail-service';
import { AuthService } from '../../services/auth-service';
import { SPACE, PROJECT, projectPage } from '../../testing/space-fixtures';
describe('SpaceDetails', () => {
  it('renders real metrics, safe text and capability-controlled future entry points', async () => {
    const state = signal({
      spaceId: SPACE.id,
      page: 0,
      detail: {
        status: 'ready',
        data: { ...SPACE, name: '<b>Engineering</b>', profilePic: 'javascript:alert(1)' },
        message: null,
      },
      projects: { status: 'ready', data: projectPage(), message: null },
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { isUserLoggedIn: signal(true), sessionEpoch: signal(1) },
        },
      ],
    });
    TestBed.overrideComponent(SpaceDetails, {
      set: {
        providers: [
          { provide: SpaceDetailService, useValue: { state, load: vi.fn(), clear: vi.fn() } },
        ],
      },
    });
    const fixture = TestBed.createComponent(SpaceDetails);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('<b>Engineering</b>');
    expect(fixture.nativeElement.querySelector('b, img')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('8 open tasks');
    expect(fixture.nativeElement.querySelector('progress')?.value).toBe(45);
    expect(fixture.nativeElement.querySelector('a.project-link')?.getAttribute('href')).toBe(
      '/projects/' + PROJECT.id,
    );
    expect(
      fixture.nativeElement.querySelector('[aria-label="Space settings (coming soon)"]'),
    ).toBeTruthy();
    state.update((s) => ({
      ...s,
      detail: {
        ...s.detail,
        data: {
          ...s.detail.data,
          capabilities: { canUpdate: false, canDelete: false, canManageMembers: false },
        },
      },
    }));
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[aria-label="Space settings (coming soon)"]'),
    ).toBeNull();
  });
  it('retries the same image URL when the user refreshes after an image failure', async () => {
    const image = 'https://example.test/space.png';
    const state = signal({
      spaceId: SPACE.id,
      page: 0,
      detail: { status: 'ready', data: { ...SPACE, profilePic: image }, message: null },
      projects: { status: 'ready', data: projectPage(), message: null },
    });
    const load = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { isUserLoggedIn: signal(true), sessionEpoch: signal(1) },
        },
      ],
    });
    TestBed.overrideComponent(SpaceDetails, {
      set: {
        providers: [{ provide: SpaceDetailService, useValue: { state, load, clear: vi.fn() } }],
      },
    });
    const fixture = TestBed.createComponent(SpaceDetails);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('img').dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    const refresh = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Refresh space'))!;
    refresh.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')?.getAttribute('src')).toBe(image);
    expect(load).toHaveBeenCalledTimes(2);
  });
  it('permits only credential-free absolute HTTP(S) image URLs', () => {
    expect(safeImageUrl('https://example.test/image.png')).toBe('https://example.test/image.png');
    for (const url of [
      'javascript:alert(1)',
      '/image.png',
      'https://user:secret@example.test/a',
      'data:image/png;base64,abc',
    ])
      expect(safeImageUrl(url)).toBeNull();
  });
});
