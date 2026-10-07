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
import { STAGES } from './board-fixtures';
import { TASK, TYPE, MEMBER } from './task-fixtures';
describe('Task Details real route and HTTP', () => {
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
    TestBed.inject(AuthService).login('task-route');
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.match('/api/spaces').forEach((r) => r.flush([]));
    http.verify();
    localStorage.clear();
  });
  async function flush(path: string, body: object, status = 200) {
    let requests: ReturnType<HttpTestingController['match']> = [];
    await expect
      .poll(() => {
        requests = http.match((r) => r.url === path);
        return requests.length;
      })
      .toBeGreaterThan(0);
    requests.forEach((r) => r.flush(body, { status, statusText: String(status) }));
  }
  async function open() {
    const h = await RouterTestingHarness.create(`/work-items/${TASK.id}`);
    h.detectChanges();
    await h.fixture.whenStable();
    http.match('/api/spaces').forEach((r) => r.flush([{ id: SPACE.id, name: SPACE.name }]));
    await flush(`/api/work-items/${TASK.id}`, TASK);
    await flush(`/api/projects/${PROJECT.id}`, PROJECT);
    await flush(`/api/spaces/${SPACE.id}`, SPACE);
    await flush(`/api/projects/${PROJECT.id}/workflow-stages`, STAGES);
    await flush(`/api/projects/${PROJECT.id}/work-item-types`, [TYPE]);
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.querySelector('[name="title"]');
      })
      .toBeTruthy();
    return h;
  }
  async function enter(h: RouterTestingHarness, name: string, value: string) {
    const el = h.routeNativeElement!.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
    el.value = value;
    el.dispatchEvent(new Event('input'));
    await h.fixture.whenStable();
  }
  function click(h: RouterTestingHarness, label: string) {
    const b = Array.from(h.routeNativeElement!.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === label,
    )!;
    expect(b).toBeTruthy();
    b.click();
    h.detectChanges();
  }
  it('loads UUID deep links, sends sparse authenticated edits, retains drafts on failure and retries', async () => {
    const h = await open();
    await enter(h, 'description', '');
    await enter(h, 'title', 'Changed');
    click(h, 'Save changes');
    const req = http.expectOne((r) => r.method === 'PATCH');
    expect(req.request.headers.get('Authorization')).toBe('Bearer task-route');
    expect(req.request.body).toEqual({ title: 'Changed', description: null });
    req.flush(
      { fieldErrors: { parentId: 'Cycle rejected' } },
      { status: 400, statusText: 'Bad request' },
    );
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.textContent;
      })
      .toContain('Cycle rejected');
    expect((h.routeNativeElement!.querySelector('[name="title"]') as HTMLInputElement).value).toBe(
      'Changed',
    );
    click(h, 'Save changes');
    http
      .expectOne((r) => r.method === 'PATCH')
      .flush({ ...TASK, title: 'Changed', description: null });
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.textContent;
      })
      .toContain('Task saved.');
    expect(h.routeNativeElement!.textContent).toContain('Comments are not available yet');
  });
  it('follows child deletion conflicts without losing the editor', async () => {
    const h = await open();
    click(h, 'Delete task');
    click(h, 'Confirm deletion');
    http
      .expectOne((r) => r.method === 'DELETE')
      .flush({ code: 'TASK_HAS_CHILDREN' }, { status: 409, statusText: 'Conflict' });
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.textContent;
      })
      .toContain('children');
    expect(h.routeNativeElement!.querySelector('[name="title"]')).toBeTruthy();
  });
  it('clears task and drafts on forbidden mutation', async () => {
    const h = await open();
    await enter(h, 'title', 'Private draft');
    click(h, 'Save changes');
    http.expectOne((r) => r.method === 'PATCH').flush({}, { status: 403, statusText: 'Forbidden' });
    http.match('/api/spaces').forEach((r) => r.flush([]));
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.querySelector('[name="title"]');
      })
      .toBeNull();
    expect(h.routeNativeElement!.textContent).not.toContain('Private draft');
  });
  it('ignores a delayed detail response after navigation', async () => {
    const h = await RouterTestingHarness.create(`/work-items/${TASK.id}`);
    h.detectChanges();
    await h.fixture.whenStable();
    http.match('/api/spaces').forEach((r) => r.flush([]));
    let pending: ReturnType<HttpTestingController['match']> = [];
    await expect
      .poll(() => {
        pending = http.match(`/api/work-items/${TASK.id}`);
        return pending.length;
      })
      .toBe(1);
    await h.navigateByUrl('/settings');
    pending[0].flush(TASK);
    await h.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/settings');
    http.expectNone(`/api/projects/${PROJECT.id}`);
  });
  it('clears private editor data when the member search reports lost access', async () => {
    const h = await open();
    click(h, 'Search members');
    http
      .expectOne((r) => r.url === `/api/spaces/${SPACE.id}/members`)
      .flush({}, { status: 403, statusText: 'Forbidden' });
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.querySelector('[name="title"]');
      })
      .toBeNull();
  });
});
