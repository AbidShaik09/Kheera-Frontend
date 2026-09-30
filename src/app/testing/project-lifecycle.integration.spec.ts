import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { ConfigService } from '../services/config-service';
import { AuthService } from '../services/auth-service';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { PROJECT, SPACE, projectPage } from './space-fixtures';
describe('Project lifecycle route integration', () => {
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
    TestBed.inject(AuthService).login('project-token');
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    localStorage.clear();
  });
  async function open(create = false, update = true, remove = true) {
    const h = await RouterTestingHarness.create(
      create ? `/spaces/${SPACE.id}/projects/new` : `/projects/${PROJECT.id}/settings`,
    );
    h.detectChanges();
    await h.fixture.whenStable();
    http.match('/api/spaces').forEach((r) => r.flush([{ id: SPACE.id, name: SPACE.name }]));
    http.match(`/api/projects/${PROJECT.id}`).forEach((r) => r.flush(PROJECT));
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.textContent;
      })
      .toContain(create ? 'Create project' : 'Project settings');
    let requests: ReturnType<HttpTestingController['match']> = [];
    await expect
      .poll(() => {
        requests = http.match(`/api/spaces/${SPACE.id}`);
        return requests.length;
      })
      .toBe(1);
    requests[0].flush({
      ...SPACE,
      capabilities: { ...SPACE.capabilities, canUpdate: update, canDelete: remove },
    });
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.querySelector('[name="name"]');
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
    const button = Array.from(h.routeNativeElement!.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === label,
    )!;
    expect(button).toBeTruthy();
    button.click();
    h.detectChanges();
  }
  it('creates in selected space, navigates by returned UUID and refreshes project overview', async () => {
    const h = await open(true);
    await enter(h, 'name', '  New project  ');
    click(h, 'Create project');
    const req = http.expectOne((r) => r.method === 'POST');
    expect(req.request.url).toBe(`/api/spaces/${SPACE.id}/projects`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer project-token');
    expect(req.request.body).toEqual({ name: 'New project', sprintCycleDays: 7 });
    req.flush({ ...PROJECT, name: 'New project' }, { status: 201, statusText: 'Created' });
    await expect
      .poll(
        () =>
          http.match(`/api/projects/${PROJECT.id}`).map((r) => {
            r.flush({ ...PROJECT, name: 'New project' });
            return r;
          }).length,
      )
      .toBe(1);
    http.match('/api/spaces').forEach((r) => r.flush([{ id: SPACE.id, name: SPACE.name }]));
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.textContent;
      })
      .toContain('New project');
  });
  it('sends sparse metadata and preserves field errors and drafts on failure', async () => {
    const h = await open();
    await enter(h, 'description', '');
    click(h, 'Save changes');
    const req = http.expectOne((r) => r.method === 'PATCH');
    expect(req.request.body).toEqual({ description: null });
    req.flush(
      { fieldErrors: { description: 'Description rejected' } },
      { status: 400, statusText: 'Bad Request' },
    );
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.textContent;
      })
      .toContain('Description rejected');
    expect(
      h.routeNativeElement!.querySelector<HTMLTextAreaElement>('[name="description"]')!.value,
    ).toBe('');
  });
  it('separates edit and delete grants without assuming role names', async () => {
    const h = await open(false, false, true);
    const text = h.routeNativeElement?.textContent;
    expect(text).toContain('Delete project');
    expect(text).not.toContain('Save changes');
    expect(h.routeNativeElement!.querySelector('fieldset')?.disabled).toBe(true);
  });
  it('confirms deletion then returns to a freshly loaded space project list', async () => {
    const h = await open();
    click(h, 'Delete project');
    await h.fixture.whenStable();
    click(h, 'Confirm deletion');
    http
      .expectOne((r) => r.method === 'DELETE')
      .flush(null, { status: 204, statusText: 'No Content' });
    await expect
      .poll(
        () =>
          http.match(`/api/spaces/${SPACE.id}`).map((r) => {
            r.flush(SPACE);
            return r;
          }).length,
      )
      .toBe(1);
    http.match((r) => r.url.endsWith('/projects')).forEach((r) => r.flush(projectPage([])));
    http.match('/api/spaces').forEach((r) => r.flush([{ id: SPACE.id, name: SPACE.name }]));
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.textContent;
      })
      .toContain('No projects yet');
  });
  it('clears inaccessible project data after mutation 404', async () => {
    const h = await open();
    await enter(h, 'name', 'Draft');
    click(h, 'Save changes');
    http.expectOne((r) => r.method === 'PATCH').flush({}, { status: 404, statusText: 'Not Found' });
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.querySelector('[name="name"]');
      })
      .toBeNull();
    http.match('/api/spaces').forEach((r) => r.flush([]));
  });
  it('clears controls after denied save even if permission revalidation fails, then retries with draft', async () => {
    const h = await open();
    await enter(h, 'name', 'Kept draft');
    click(h, 'Save changes');
    http.expectOne((r) => r.method === 'PATCH').flush({}, { status: 403, statusText: 'Forbidden' });
    let reads: ReturnType<HttpTestingController['match']> = [];
    await expect
      .poll(() => {
        reads = http.match(`/api/projects/${PROJECT.id}`);
        return reads.length;
      })
      .toBe(1);
    h.detectChanges();
    expect(h.routeNativeElement?.querySelector('[name="name"]')).toBeNull();
    reads[0].flush({}, { status: 503, statusText: 'Unavailable' });
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.textContent;
      })
      .toContain('Unable to complete');
    click(h, 'Refresh project access');
    http.expectOne(`/api/projects/${PROJECT.id}`).flush(PROJECT);
    await expect
      .poll(() => {
        reads = http.match(`/api/spaces/${SPACE.id}`);
        return reads.length;
      })
      .toBe(1);
    reads[0].flush(SPACE);
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.querySelector<HTMLInputElement>('[name="name"]')?.value;
      })
      .toBe('Kept draft');
  });
  it('ignores a previous project read after navigation to another project', async () => {
    const h = await RouterTestingHarness.create(`/projects/${PROJECT.id}/settings`);
    h.detectChanges();
    await h.fixture.whenStable();
    http.match('/api/spaces').forEach((r) => r.flush([]));
    const old = http.expectOne(`/api/projects/${PROJECT.id}`);
    const other = '00000000-0000-4000-8000-000000000099';
    await h.navigateByUrl(`/projects/${other}/settings`);
    h.detectChanges();
    await h.fixture.whenStable();
    http
      .expectOne(`/api/projects/${other}`)
      .flush({ ...PROJECT, id: other, name: 'Other project' });
    let reads: ReturnType<HttpTestingController['match']> = [];
    await expect
      .poll(() => {
        reads = http.match(`/api/spaces/${SPACE.id}`);
        return reads.length;
      })
      .toBe(1);
    reads[0].flush(SPACE);
    old.flush(PROJECT);
    await expect
      .poll(() => {
        h.detectChanges();
        return h.routeNativeElement?.querySelector<HTMLInputElement>('[name="name"]')?.value;
      })
      .toBe('Other project');
  });
});
