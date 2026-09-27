import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { routes } from '../app.routes';
import { AuthService } from '../services/auth-service';
import { ConfigService } from '../services/config-service';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { SPACE, PROJECT, projectPage } from './space-fixtures';
describe('Space Details route integration', () => {
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
    TestBed.inject(AuthService).login('space-test-token');
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    localStorage.clear();
  });
  async function settle(harness: RouterTestingHarness) {
    for (const req of http.match('/api/spaces')) req.flush([{ id: SPACE.id, name: SPACE.name }]);
    const detail = http.expectOne('/api/spaces/' + SPACE.id);
    expect(detail.request.headers.get('Authorization')).toBe('Bearer space-test-token');
    detail.flush(SPACE);
    const projects = http.expectOne((req) => req.url === '/api/spaces/' + SPACE.id + '/projects');
    expect(projects.request.params.get('size')).toBe('12');
    projects.flush(projectPage());
    await expect.poll(() => harness.routeNativeElement?.textContent).toContain(PROJECT.name);
    await harness.fixture.whenStable();
    harness.detectChanges();
  }
  it('resolves protected metadata/projects and navigates to a real project summary', async () => {
    const harness = await RouterTestingHarness.create('/spaces/' + SPACE.id);
    expect(TestBed.inject(Router).url).toBe('/spaces/' + SPACE.id);
    await settle(harness);
    expect(
      harness.routeNativeElement?.querySelector('[aria-current="page"]')?.textContent,
    ).toContain(SPACE.name);
    expect(harness.routeNativeElement?.textContent).toContain('8 open tasks');
    http.expectNone((req) => req.url.includes('/members'));
    await harness.navigateByUrl('/projects/' + PROJECT.id);
    for (const req of http.match('/api/spaces')) req.flush([{ id: SPACE.id, name: SPACE.name }]);
    http.expectOne('/api/projects/' + PROJECT.id).flush(PROJECT);
    await expect
      .poll(() => harness.routeNativeElement?.textContent)
      .toContain('The task board is coming soon.');
    expect(harness.routeNativeElement?.querySelector('[aria-current="page"]')).toBeNull();
  });
  it('keeps metadata visible when the project API fails', async () => {
    const harness = await RouterTestingHarness.create('/spaces/' + SPACE.id);
    for (const req of http.match('/api/spaces')) req.flush([{ id: SPACE.id, name: SPACE.name }]);
    http.expectOne('/api/spaces/' + SPACE.id).flush(SPACE);
    http
      .expectOne((req) => req.url.endsWith('/projects'))
      .flush({}, { status: 503, statusText: 'Unavailable' });
    await expect
      .poll(() => harness.routeNativeElement?.textContent)
      .toContain('Projects are unavailable');
    expect(harness.routeNativeElement?.textContent).toContain(SPACE.description);
    expect(harness.routeNativeElement?.textContent).not.toContain('No projects yet');
  });
  it('redirects an expired detail session and removes all resource views', async () => {
    const harness = await RouterTestingHarness.create('/spaces/' + SPACE.id);
    for (const req of http.match('/api/spaces')) req.flush([{ id: SPACE.id, name: SPACE.name }]);
    const projects = http.expectOne((req) => req.url.endsWith('/projects'));
    http
      .expectOne('/api/spaces/' + SPACE.id)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    projects.flush(projectPage());
    await expect.poll(() => TestBed.inject(Router).url).toBe('/login');
    expect(harness.routeNativeElement?.textContent).not.toContain(PROJECT.name);
  });
});
