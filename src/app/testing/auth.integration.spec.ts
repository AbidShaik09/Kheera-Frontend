import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../services/auth-service';
import { ConfigService } from '../services/config-service';
import { authInterceptor } from '../interceptors/auth.interceptor';

describe('Authentication HTTP integration', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: ConfigService, useValue: { apiUrl: '/api/' } },
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); localStorage.clear(); });

  it('logs in with raw text, then sends the token for session restoration', async () => {
    const login = auth.loginWithPassword({ email: 'test@example.test', password: 'test-password' });
    const request = http.expectOne('/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.responseType).toBe('text');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush('test-jwt');
    expect((await login).ok).toBe(true);
    const restore = auth.loginStatus();
    const me = http.expectOne('/api/users/me');
    expect(me.request.headers.get('Authorization')).toBe('Bearer test-jwt');
    me.flush({ id: 'user-1', name: 'Test', email: 'test@example.test' });
    expect(await restore).toBe(true);
  });

  it('clears an expired session through the real HTTP error boundary', async () => {
    auth.login('expired-token');
    const restore = auth.loginStatus();
    http.expectOne('/api/users/me').flush('Invalid Or Expired Token', { status: 401, statusText: 'Unauthorized' });
    expect(await restore).toBe(false);
    expect(auth.accessToken()).toBeNull();
    expect(auth.isUserLoggedIn()).toBe(false);
  });
});
