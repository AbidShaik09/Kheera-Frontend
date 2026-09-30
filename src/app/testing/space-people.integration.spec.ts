import { By } from '@angular/platform-browser';
import { SpacePeople } from '../pages/space-people/space-people';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { ConfigService } from '../services/config-service';
import { AuthService } from '../services/auth-service';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { SPACE } from './space-fixtures';
const role = { id: '33333333-3333-3333-3333-333333333333', name: 'Contributor' };
const member = {
  id: '22222222-2222-2222-2222-222222222222',
  user: { id: '44444444-4444-4444-4444-444444444444', name: 'Alex', email: 'alex@example.test' },
  role,
};
const envelope = (items: unknown[], size: number) => ({
  items,
  page: 0,
  size,
  totalItems: items.length,
  totalPages: items.length ? 1 : 0,
});
describe('People route integration', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: ConfigService, useValue: { apiUrl: '/api/' } },
      ],
    });
    TestBed.inject(AuthService).login('people-token');
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    localStorage.clear();
  });
  async function open(denied = false, profileError = false) {
    const h = await RouterTestingHarness.create(`/spaces/${SPACE.id}/people`);
    h.detectChanges();
    await h.fixture.whenStable();
    http.match('/api/spaces').forEach((r) => r.flush([{ id: SPACE.id, name: SPACE.name }]));
    http
      .match('/api/users/me')
      .forEach((r) =>
        profileError
          ? r.flush({}, { status: 503, statusText: 'Unavailable' })
          : r.flush(member.user),
      );
    http.match(`/api/spaces/${SPACE.id}`).forEach((r) => r.flush(SPACE));
    http
      .match((r) => r.url.endsWith('/members'))
      .forEach((r) =>
        denied
          ? r.flush({}, { status: 403, statusText: 'Forbidden' })
          : r.flush(envelope([member], 25)),
      );
    http.match((r) => r.url.endsWith('/roles')).forEach((r) => r.flush(envelope([role], 100)));
    http
      .match((r) => r.url.endsWith('/permissions'))
      .forEach((r) => r.flush(envelope([{ ...role, name: 'space.members.read' }], 100)));
    await h.fixture.whenStable();
    h.detectChanges();
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.textContent;
      })
      .toContain('Engineering');
    await expect
      .poll(() => h.routeNativeElement?.textContent)
      .not.toContain('Loading people and catalogues');
    return h;
  }
  it('renders People and independent space metadata on a denied directory read', async () => {
    const h = await open(true);
    expect(h.routeNativeElement?.textContent).toContain('Engineering');
    expect(h.routeNativeElement?.textContent).toContain('You do not have permission');
    expect(h.routeNativeElement?.textContent).not.toContain('alex@example.test');
  });
  it('preserves an existing-account draft after duplicate membership without duplicate submits', async () => {
    const h = await open();
    const root = h.routeNativeElement!;
    const input = root.querySelector<HTMLInputElement>('[name="email"]');
    expect(input).toBeTruthy();
    if (!input) return;
    input.value = 'new@example.test';
    input.dispatchEvent(new Event('input'));
    const select = root.querySelector<HTMLSelectElement>('[name="addRole"]')!;
    select.value = role.id;
    select.dispatchEvent(new Event('change'));
    await h.fixture.whenStable();
    const form = root.querySelector('form[data-add]')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const r = http.expectOne((req) => req.method === 'POST');
    expect(r.request.body).toEqual({ email: 'new@example.test', roleId: role.id });
    expect(r.request.headers.get('Authorization')).toBe('Bearer people-token');
    r.flush({ code: 'DUPLICATE_MEMBERSHIP' }, { status: 409, statusText: 'Conflict' });
    await h.fixture.whenStable();
    h.detectChanges();
    expect(input.value).toBe('new@example.test');
    await expect
      .poll(() => {
        h.detectChanges();
        return root.textContent;
      })
      .toContain('already belongs');
  });
  it('refreshes a failed profile so authorized removal can recover on this page', async () => {
    const h = await open(false, true);
    const buttons = () => Array.from(h.routeNativeElement!.querySelectorAll('button'));
    expect(buttons().find((b) => b.textContent?.trim() === 'Remove Alex')?.disabled).toBe(true);
    buttons()
      .find((b) => b.textContent?.trim() === 'Refresh people')!
      .click();
    const profile = http.match('/api/users/me');
    http.match((r) => r.url === `/api/spaces/${SPACE.id}`).forEach((r) => r.flush(SPACE));
    http.match((r) => r.url.endsWith('/members')).forEach((r) => r.flush(envelope([member], 25)));
    http.match((r) => r.url.endsWith('/roles')).forEach((r) => r.flush(envelope([role], 100)));
    http.match((r) => r.url.endsWith('/permissions')).forEach((r) => r.flush(envelope([], 100)));
    profile.forEach((r) => r.flush(member.user));
    expect(profile).toHaveLength(1);
    await expect
      .poll(() => {
        h.detectChanges();
        return buttons().find((b) => b.textContent?.trim() === 'Remove Alex')?.disabled;
      })
      .toBe(false);
  });
  it('clamps an out-of-range page after the member list shrinks', async () => {
    const h = await open();
    const component = h.routeDebugElement!.query(By.directive(SpacePeople))
      .componentInstance as SpacePeople;
    component.go(2);
    const flushPage = (index: number) => {
      http.match(`/api/spaces/${SPACE.id}`).forEach((r) => r.flush(SPACE));
      http.match((r) => r.url.endsWith('/roles')).forEach((r) => r.flush(envelope([role], 100)));
      http.match((r) => r.url.endsWith('/permissions')).forEach((r) => r.flush(envelope([], 100)));
      http
        .expectOne((r) => r.url.endsWith('/members') && r.params.get('page') === String(index))
        .flush({
          items: index ? [] : [member],
          page: index,
          size: 25,
          totalItems: 1,
          totalPages: 1,
        });
    };
    flushPage(2);
    await expect.poll(() => component.page).toBe(0);
    flushPage(0);
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.textContent;
      })
      .toContain('Page 1 of 1');
  });
  it.each([403, 404])(
    'revalidates protected membership state after mutation %s',
    async (status) => {
      const h = await open();
      const component = h.routeDebugElement!.query(By.directive(SpacePeople))
        .componentInstance as SpacePeople;
      component.email = 'draft@example.test';
      component.confirmation.set(member);
      const removal = component.remove();
      http.expectOne((r) => r.method === 'DELETE').flush({}, { status, statusText: 'Unavailable' });
      let detail: ReturnType<HttpTestingController['match']> = [];
      await expect
        .poll(() => {
          detail = http.match(`/api/spaces/${SPACE.id}`);
          return detail.length;
        })
        .toBe(1);
      detail[0].flush(SPACE);
      let refresh: ReturnType<HttpTestingController['match']> = [];
      await expect
        .poll(() => {
          refresh = http.match((r) => r.url.endsWith('/members'));
          return refresh.length;
        })
        .toBe(1);
      if (status === 403) refresh[0].flush({}, { status: 403, statusText: 'Forbidden' });
      else refresh[0].flush(envelope([], 25));
      http.match(`/api/spaces/${SPACE.id}`).forEach((r) => r.flush(SPACE));
      http.match((r) => r.url.endsWith('/roles')).forEach((r) => r.flush(envelope([role], 100)));
      http.match((r) => r.url.endsWith('/permissions')).forEach((r) => r.flush(envelope([], 100)));
      await removal;
      expect(component.members()?.items ?? null).toEqual(status === 403 ? null : []);
      h.detectChanges();
      expect(h.routeNativeElement?.textContent).not.toContain('alex@example.test');
      expect(component.confirmation()).toBeNull();
      expect(component.email).toBe('draft@example.test');
    },
  );
});
