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
import { boardPage, task, STAGES } from './board-fixtures';
describe('Project board routes', () => {
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
    TestBed.inject(AuthService).login('board-token');
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    localStorage.clear();
  });
  async function request(path: string) {
    let reqs: ReturnType<HttpTestingController['match']> = [];
    await expect
      .poll(() => {
        reqs = http.match((r) => r.url === path);
        return reqs.length;
      })
      .toBe(1);
    return reqs[0];
  }
  async function ready(
    h: RouterTestingHarness,
    update = true,
    page = boardPage(),
    projectLoaded = false,
  ) {
    if (!projectLoaded) (await request(`/api/projects/${PROJECT.id}`)).flush(PROJECT);
    (await request(`/api/spaces/${SPACE.id}`)).flush({
      ...SPACE,
      capabilities: { ...SPACE.capabilities, canUpdate: update },
    });
    (await request(`/api/projects/${PROJECT.id}/workflow-stages`)).flush(STAGES);
    const req = await request(`/api/projects/${PROJECT.id}/work-items`);
    expect(req.request.params.get('size')).toBe('25');
    req.flush(page);
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.querySelector('.board');
      })
      .toBeTruthy();
  }
  async function open(update = true, page = boardPage(), projectLoaded = false) {
    const h = await RouterTestingHarness.create(`/projects/${PROJECT.id}`);
    h.detectChanges();
    await h.fixture.whenStable();
    http.match('/api/spaces').forEach((r) => r.flush([{ id: SPACE.id, name: SPACE.name }]));
    (await request(`/api/projects/${PROJECT.id}`)).flush(PROJECT);
    await h.fixture.whenStable();
    h.detectChanges();
    expect(h.routeNativeElement?.querySelector('app-project-board')).toBeTruthy();
    await ready(h, update, page, true);
    return h;
  }
  function click(h: RouterTestingHarness, label: string) {
    const el = Array.from(h.routeNativeElement!.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === label,
    )!;
    expect(el).toBeTruthy();
    el.click();
    h.detectChanges();
  }
  async function move(h: RouterTestingHarness) {
    const select = h.routeNativeElement!.querySelector<HTMLSelectElement>('select')!;
    select.value = STAGES[1].id;
    select.dispatchEvent(new Event('change'));
    await h.fixture.whenStable();
    click(h, 'Move task');
  }
  it('renders custom and empty columns with page-only counts and explicit pagination', async () => {
    const h = await open(
      true,
      boardPage(
        Array.from({ length: 25 }, (_, i) => task(i)),
        0,
        26,
      ),
    );
    expect(h.routeNativeElement?.textContent).toContain('26 tasks');
    expect(h.routeNativeElement?.textContent).toContain('0 on this page');
    click(h, 'Next page');
    await ready(h, true, boardPage([task(25, STAGES[1])], 1, 26));
    expect(h.routeNativeElement?.textContent).toContain('Task 26');
    expect(h.routeNativeElement?.textContent).toContain('Complete');
  });
  it('serializes a keyboard move and reloads both columns authoritatively', async () => {
    const h = await open();
    await move(h);
    click(h, 'Move task');
    const req = http.expectOne((r) => r.method === 'POST');
    expect(req.request.body).toEqual({ stageId: STAGES[1].id });
    expect(req.request.headers.get('Authorization')).toBe('Bearer board-token');
    const moved = { ...task(), stageId: STAGES[1].id, stageName: STAGES[1].name, complete: true };
    req.flush(moved);
    await ready(h, true, boardPage([moved]));
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.textContent;
      })
      .toContain('Task moved.');
  });
  it('retains cards and selected destination when an ordinary move fails', async () => {
    const h = await open();
    await move(h);
    http.expectOne((r) => r.method === 'POST').flush({}, { status: 500, statusText: 'Error' });
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.textContent;
      })
      .toContain('Unable');
    expect(h.routeNativeElement?.querySelector<HTMLSelectElement>('select')?.value).toBe(
      STAGES[1].id,
    );
    expect(h.routeNativeElement?.textContent).toContain('Task 1');
  });
  it('hides moves without update permission', async () => {
    const h = await open(false);
    expect(h.routeNativeElement?.querySelector('select')).toBeNull();
    expect(h.routeNativeElement?.textContent).toContain('Task 1');
  });
  it('clears private cards after inaccessible refresh', async () => {
    const h = await open();
    click(h, 'Refresh project');
    (await request(`/api/projects/${PROJECT.id}`)).flush(
      {},
      { status: 404, statusText: 'Missing' },
    );
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.textContent;
      })
      .toContain('unavailable');
    http.match('/api/spaces').forEach((r) => r.flush([]));
    expect(h.routeNativeElement?.textContent).not.toContain('Task 1');
  });
  it('ignores delayed board results after leaving the route', async () => {
    const h = await open();
    click(h, 'Refresh project');
    (await request(`/api/projects/${PROJECT.id}`)).flush(PROJECT);
    (await request(`/api/spaces/${SPACE.id}`)).flush(SPACE);
    (await request(`/api/projects/${PROJECT.id}/workflow-stages`)).flush(STAGES);
    const pending = await request(`/api/projects/${PROJECT.id}/work-items`);
    await h.navigateByUrl('/dashboard');
    pending.flush(boardPage());
    http.match('/api/spaces').forEach((r) => r.flush([]));
    h.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    expect(h.routeNativeElement?.querySelector('.board')).toBeNull();
  });
});
