import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProjectSummaryService } from './project-summary-service';
import { AuthService } from './auth-service';
import { ConfigService } from './config-service';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { PROJECT } from '../testing/space-fixtures';
describe('ProjectSummaryService', () => {
  let service: ProjectSummaryService;
  let http: HttpTestingController;
  let auth: AuthService;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ProjectSummaryService,
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: ConfigService, useValue: { apiUrl: '/api/' } },
      ],
    });
    service = TestBed.inject(ProjectSummaryService);
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    auth.login('project-test');
  });
  afterEach(() => {
    http.verify();
    localStorage.clear();
  });
  it('reads a real authorized project summary', async () => {
    const pending = service.load(PROJECT.id);
    const req = http.expectOne('/api/projects/' + PROJECT.id);
    expect(req.request.headers.get('Authorization')).toBe('Bearer project-test');
    req.flush(PROJECT);
    await pending;
    expect(service.state().data).toEqual(PROJECT);
  });
  it.each([401, 403, 404, 500])('clears project on %s', async (status) => {
    const pending = service.load(PROJECT.id);
    http.expectOne('/api/projects/' + PROJECT.id).flush({}, { status, statusText: 'Failure' });
    await pending;
    expect(service.state().data).toBeNull();
    if (status === 401) expect(auth.isUserLoggedIn()).toBe(false);
  });
  it('ignores late responses after leaving the project', async () => {
    const pending = service.load(PROJECT.id);
    const req = http.expectOne('/api/projects/' + PROJECT.id);
    service.clear();
    req.flush(PROJECT);
    await pending;
    expect(service.state().data).toBeNull();
  });
});
