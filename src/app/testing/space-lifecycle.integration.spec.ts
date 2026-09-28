import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { ConfigService } from '../services/config-service';
import { AuthService } from '../services/auth-service';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { SPACE } from './space-fixtures';
describe('Space lifecycle route integration', () => {
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
    TestBed.inject(AuthService).login('lifecycle-token');
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    localStorage.clear();
  });
  it('opens a create form instead of interpreting new as a space UUID', async () => {
    const harness = await RouterTestingHarness.create('/spaces/new');
    http.match('/api/spaces').forEach((r) => r.flush([]));
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.querySelector('input[name="name"]')).toBeTruthy();
    expect(harness.routeNativeElement?.textContent).toContain('Create space');
  });
  async function settings() {
    const harness = await RouterTestingHarness.create('/spaces/' + SPACE.id + '/settings');
    http.match('/api/spaces').forEach((r) => r.flush([{ id: SPACE.id, name: SPACE.name }]));
    http.expectOne('/api/spaces/' + SPACE.id).flush(SPACE);
    await expect
      .poll(() => harness.routeNativeElement?.querySelector('[name="name"]'))
      .toBeTruthy();
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness;
  }
  async function enter(harness: RouterTestingHarness, name: string, value: string) {
    const input = harness.routeNativeElement!.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
  }
  function submit(harness: RouterTestingHarness) {
    harness
      .routeNativeElement!.querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    harness.detectChanges();
  }
  it('sends only changed fields through the bearer interceptor and refreshes sidebar', async () => {
    const harness = await settings();
    await enter(harness, 'description', '');
    submit(harness);
    const req = http.expectOne((r) => r.method === 'PATCH');
    expect(req.request.headers.get('Authorization')).toBe('Bearer lifecycle-token');
    expect(req.request.body).toEqual({ description: null });
    req.flush({ ...SPACE, description: null });
    await expect.poll(() => harness.routeNativeElement?.textContent).toContain('Space saved.');
    http.expectOne('/api/spaces').flush([{ id: SPACE.id, name: SPACE.name }]);
    await harness.fixture.whenStable();
  });
  it('prevents duplicate writes and preserves field errors and draft on failure', async () => {
    const harness = await settings();
    await enter(harness, 'name', 'Draft');
    submit(harness);
    submit(harness);
    const req = http.expectOne((r) => r.method === 'PATCH');
    req.flush(
      { fieldErrors: { name: 'Name already used.' } },
      { status: 400, statusText: 'Invalid' },
    );
    await expect
      .poll(() => harness.routeNativeElement?.textContent)
      .toContain('Name already used.');
    expect(
      harness.routeNativeElement?.querySelector<HTMLInputElement>('[name="name"]')?.value,
    ).toBe('Draft');
  });
  it('does not navigate or refresh when a save resolves after leaving the editor', async () => {
    const harness = await settings();
    await enter(harness, 'name', 'Draft');
    submit(harness);
    const req = http.expectOne((r) => r.method === 'PATCH');
    await harness.navigateByUrl('/dashboard');
    http.match('/api/spaces').forEach((r) => r.flush([{ id: SPACE.id, name: SPACE.name }]));
    req.flush({ ...SPACE, name: 'Draft' });
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    http.expectNone('/api/spaces');
  });
  it('ignores an old space response after changing the settings route', async () => {
    const harness = await settings();
    const nextId = '00000000-0000-4000-8000-000000000002';
    await enter(harness, 'name', 'Draft');
    submit(harness);
    const req = http.expectOne((r) => r.method === 'PATCH');
    await harness.navigateByUrl('/spaces/' + nextId + '/settings');
    http.match('/api/spaces').forEach((r) => r.flush([{ id: nextId, name: 'Second' }]));
    http.expectOne('/api/spaces/' + nextId).flush({ ...SPACE, id: nextId, name: 'Second' });
    req.flush({ ...SPACE, name: 'Draft' });
    await harness.fixture.whenStable();
    await expect
      .poll(
        () => harness.routeNativeElement?.querySelector<HTMLInputElement>('[name="name"]')?.value,
      )
      .toBe('Second');
  });
  it('preserves the create draft but blocks repeated submissions after a 403', async () => {
    const harness = await RouterTestingHarness.create('/spaces/new');
    http.match('/api/spaces').forEach((r) => r.flush([]));
    await harness.fixture.whenStable();
    await enter(harness, 'name', 'My draft');
    submit(harness);
    http.expectOne((r) => r.method === 'POST').flush({}, { status: 403, statusText: 'Forbidden' });
    await expect
      .poll(() => harness.routeNativeElement?.textContent)
      .toContain('You do not have permission');
    expect(
      harness.routeNativeElement?.querySelector<HTMLInputElement>('[name="name"]')?.value,
    ).toBe('My draft');
    expect(
      harness.routeNativeElement?.querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.disabled,
    ).toBe(true);
    submit(harness);
    http.expectNone((r) => r.method === 'POST');
  });
});
