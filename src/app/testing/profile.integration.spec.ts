import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../services/auth-service';
import { ConfigService } from '../services/config-service';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { Profile } from '../pages/profile/profile';
import { Navbar } from '../elements/navbar/navbar';

describe('Profile HTTP and shared view integration', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
  });
  it('shares restored and refreshed identity across profile and account navigation', async () => {
    TestBed.configureTestingModule({
      imports: [Profile, Navbar],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: ConfigService, useValue: { apiUrl: '/api/' } },
      ],
    });
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    auth.login('identity-test-token');
    const restoring = auth.loginStatus();
    const me = http.expectOne('/api/users/me');
    expect(me.request.headers.get('Authorization')).toBe('Bearer identity-test-token');
    me.flush({ id: 'user-1', name: 'Ada', email: 'ada@example.test' });
    await restoring;
    const profile = TestBed.createComponent(Profile);
    const nav = TestBed.createComponent(Navbar);
    await profile.whenStable();
    await nav.whenStable();
    http.expectNone('/api/users/me');
    expect(profile.nativeElement.textContent).toContain('Ada');
    expect(nav.nativeElement.textContent).toContain('ada@example.test');
    profile.nativeElement.querySelector('button').click();
    const refreshing = auth.refreshCurrentUser();
    profile.detectChanges();
    nav.detectChanges();
    expect(profile.nativeElement.textContent).toContain('Loading');
    expect(nav.nativeElement.textContent).not.toContain('Ada');
    http
      .expectOne('/api/users/me')
      .flush({ id: 'user-1', name: 'Ada Updated', email: 'ada@example.test' });
    await refreshing;
    await profile.whenStable();
    await nav.whenStable();
    expect(profile.nativeElement.textContent).toContain('Ada Updated');
    expect(nav.nativeElement.textContent).toContain('Ada Updated');
    auth.logout();
    profile.detectChanges();
    nav.detectChanges();
    expect(profile.nativeElement.textContent).not.toContain('Ada');
    expect(nav.nativeElement.textContent).not.toContain('Ada');
  });
});
