import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { routes } from '../app.routes';
import { AuthService } from '../services/auth-service';
import { ConfigService } from '../services/config-service';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { WorkspaceService } from '../services/workspace-service';

const spaces = [
  { id: '00000000-0000-4000-8000-000000000001', name: 'Engineering' },
  { id: '00000000-0000-4000-8000-000000000002', name: 'Design' },
];
describe('Workspace routing and HTTP integration', () => {
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
    TestBed.inject(AuthService).login('isolated-test-token');
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    localStorage.clear();
  });
  async function flushSpaces(harness: RouterTestingHarness, data = spaces) {
    const req = http.expectOne('/api/spaces');
    expect(req.request.headers.get('Authorization')).toBe('Bearer isolated-test-token');
    req.flush(data);
    await expect.poll(() => TestBed.inject(WorkspaceService).state().status).toBe('ready');
    await harness.fixture.whenStable();
    harness.detectChanges();
  }
  it('restores URL-selected space and revalidates when switching', async () => {
    const harness = await RouterTestingHarness.create('/dashboard?space=' + spaces[0].id);
    await flushSpaces(harness);
    expect(
      harness.routeNativeElement?.querySelector('[aria-current="page"]')?.textContent,
    ).toContain('Engineering');
    await harness.navigateByUrl('/dashboard?space=' + spaces[1].id);
    await flushSpaces(harness);
    expect(
      harness.routeNativeElement?.querySelector('[aria-current="page"]')?.textContent,
    ).toContain('Design');
    expect(harness.routeNativeElement?.textContent).not.toContain('T300');
  });
  it('does not expose an inaccessible selected space after refresh', async () => {
    const harness = await RouterTestingHarness.create('/dashboard?space=' + spaces[0].id);
    await flushSpaces(harness, []);
    expect(harness.routeNativeElement?.textContent).toContain('This space is no longer available');
    expect(harness.routeNativeElement?.textContent).not.toContain('Engineering');
  });
  it('redirects to login and clears the session on a spaces 401', async () => {
    const harness = await RouterTestingHarness.create('/dashboard');
    http.expectOne('/api/spaces').flush({}, { status: 401, statusText: 'Unauthorized' });
    await expect.poll(() => TestBed.inject(AuthService).accessToken()).toBeNull();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(AuthService).accessToken()).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
