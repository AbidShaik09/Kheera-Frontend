import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { ConfigService } from '../services/config-service';
import { AuthService } from '../services/auth-service';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { PROJECT, SPACE } from './space-fixtures';
const stage = {
  id: '00000000-0000-4000-8000-000000000021',
  name: 'Released',
  icon: '✓',
  position: 0,
  complete: true,
};
const endpoint = `/api/projects/${PROJECT.id}/workflow-stages`;
describe('Workflow settings route integration', () => {
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
    TestBed.inject(AuthService).login('workflow-token');
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    localStorage.clear();
  });
  async function flush(h: RouterTestingHarness, path: string, body: object, status = 200) {
    let requests: ReturnType<HttpTestingController['match']> = [];
    await expect
      .poll(() => {
        h.detectChanges();
        requests = http.match(path);
        return requests.length;
      })
      .toBeGreaterThan(0);
    requests.forEach((r) => r.flush(body, { status, statusText: 'Result' }));
    await h.fixture.whenStable();
    h.detectChanges();
  }
  async function refresh(h: RouterTestingHarness, update = true) {
    await flush(h, `/api/projects/${PROJECT.id}`, PROJECT);
    await flush(h, `/api/spaces/${SPACE.id}`, {
      ...SPACE,
      capabilities: { ...SPACE.capabilities, canUpdate: update },
    });
    await flush(h, endpoint, [stage]);
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.textContent;
      })
      .toContain('Released');
  }
  async function open(update = true) {
    const h = await RouterTestingHarness.create(`/projects/${PROJECT.id}/workflow`);
    h.detectChanges();
    await h.fixture.whenStable();
    http.match('/api/spaces').forEach((r) => r.flush([{ id: SPACE.id, name: SPACE.name }]));
    expect(h.routeNativeElement?.querySelector('app-workflow-settings')).toBeTruthy();
    await refresh(h, update);
    return h;
  }
  function click(h: RouterTestingHarness, label: string) {
    const button = Array.from(h.routeNativeElement!.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === label,
    )!;
    expect(button).toBeTruthy();
    button.click();
    h.detectChanges();
  }
  async function enter(h: RouterTestingHarness, name: string, value: string) {
    const input = h.routeNativeElement!.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await h.fixture.whenStable();
  }
  it('renames a custom completed stage with sparse PATCH then refreshes authoritative metadata', async () => {
    const h = await open();
    click(h, 'Edit Released');
    await enter(h, 'name', 'Shipped');
    click(h, 'Save stage');
    const req = http.expectOne((r) => r.method === 'PATCH');
    expect(req.request.url).toBe(`${endpoint}/${stage.id}`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer workflow-token');
    expect(req.request.body).toEqual({ name: 'Shipped' });
    req.flush({ ...stage, name: 'Shipped' });
    await refresh(h);
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.textContent;
      })
      .toContain('Stage saved.');
  });
  it('shows read-only stages without space.update and sends no writes', async () => {
    const h = await open(false);
    expect(h.routeNativeElement?.textContent).toContain('Released');
    expect(h.routeNativeElement?.querySelector('form')).toBeNull();
    expect(h.routeNativeElement?.textContent).toContain('permission');
  });
  it('preserves draft and refreshes authoritative stages on a stage-limit conflict', async () => {
    const h = await open();
    await enter(h, 'name', 'Waiting');
    click(h, 'Create stage');
    http
      .expectOne((r) => r.method === 'POST')
      .flush({ code: 'STAGE_LIMIT' }, { status: 409, statusText: 'Conflict' });
    await refresh(h);
    expect(h.routeNativeElement?.querySelector<HTMLInputElement>('[name="name"]')?.value).toBe(
      'Waiting',
    );
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.textContent;
      })
      .toContain('100 stages');
  });
  it('revokes write controls after forbidden mutation and rechecks permission', async () => {
    const h = await open();
    await enter(h, 'name', 'Waiting');
    click(h, 'Create stage');
    http.expectOne((r) => r.method === 'POST').flush({}, { status: 403, statusText: 'Forbidden' });
    await refresh(h, false);
    expect(h.routeNativeElement?.querySelector('form')).toBeNull();
  });
  it('clears private data after missing project on refresh', async () => {
    const h = await open();
    click(h, 'Refresh workflow');
    await flush(h, `/api/projects/${PROJECT.id}`, {}, 404);
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.textContent;
      })
      .toContain('unavailable');
    http.match('/api/spaces').forEach((r) => r.flush([]));
    expect(h.routeNativeElement?.textContent).not.toContain('Released');
    expect(h.routeNativeElement?.querySelector('form')).toBeNull();
  });
  it('ignores an old stage list after leaving the project', async () => {
    const h = await open();
    click(h, 'Refresh workflow');
    await flush(h, `/api/projects/${PROJECT.id}`, PROJECT);
    await flush(h, `/api/spaces/${SPACE.id}`, SPACE);
    let pendingRequests: ReturnType<HttpTestingController['match']> = [];
    await expect
      .poll(() => {
        pendingRequests = http.match(endpoint);
        return pendingRequests.length;
      })
      .toBe(1);
    const pending = pendingRequests[0];
    await h.navigateByUrl('/dashboard');
    pending.flush([stage]);
    http.match('/api/spaces').forEach((r) => r.flush([]));
    h.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    expect(h.routeNativeElement?.querySelector('app-workflow-settings')).toBeNull();
  });
  it('requires confirmation, sends one delete while pending, and reloads stages', async () => {
    const h = await open();
    click(h, 'Delete Released');
    http.expectNone((r) => r.method === 'DELETE');
    click(h, 'Confirm deletion');
    click(h, 'Confirm deletion');
    const request = http.expectOne((r) => r.method === 'DELETE');
    expect(request.request.url).toBe(`${endpoint}/${stage.id}`);
    request.flush(null, { status: 204, statusText: 'No Content' });
    await refresh(h);
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.textContent;
      })
      .toContain('Stage deleted.');
  });
  it('preserves a draft through failed conflict refresh and disables stale writes', async () => {
    const h = await open();
    await enter(h, 'name', 'Keep this');
    click(h, 'Create stage');
    http
      .expectOne((r) => r.method === 'POST')
      .flush({ code: 'STAGE_LIMIT' }, { status: 409, statusText: 'Conflict' });
    await flush(h, `/api/projects/${PROJECT.id}`, {}, 503);
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.textContent;
      })
      .toContain('Unable');
    expect(h.routeNativeElement?.querySelector('form')).toBeNull();
    click(h, 'Refresh workflow');
    await refresh(h);
    expect(h.routeNativeElement?.querySelector<HTMLInputElement>('[name="name"]')?.value).toBe(
      'Keep this',
    );
  });
});
