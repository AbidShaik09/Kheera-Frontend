import { TestBed } from '@angular/core/testing';
import { Profile } from './profile';
import { AuthService } from '../../services/auth-service';
import { ApiService } from '../../services/api-service';
import { vi } from 'vitest';

describe('Profile', () => {
  afterEach(() => localStorage.clear());
  it('renders authenticated identity as read-only text', async () => {
    TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        {
          provide: ApiService,
          useValue: {
            get: vi.fn().mockResolvedValue({
              ok: true,
              status: 200,
              body: {
                id: 'user-1',
                name: '<b>Ada</b>',
                email: 'ada@example.test',
              },
            }),
          },
        },
      ],
    });
    const auth = TestBed.inject(AuthService);
    auth.login('test-token');
    await auth.loginStatus();
    const fixture = TestBed.createComponent(Profile);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('<b>Ada</b>');
    expect(fixture.nativeElement.textContent).toContain('ada@example.test');
    expect(fixture.nativeElement.querySelector('b, input, form')).toBeNull();
    expect(fixture.nativeElement.querySelector('button')?.textContent).toContain('Refresh');
  });
});
