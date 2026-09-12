import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { vi } from 'vitest';

import { Login } from './login';
import { AuthService } from '../../services/auth-service';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let authService: {
    loginWithPassword: ReturnType<typeof vi.fn>;
  };
  let router: {
    navigateByUrl: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authService = {
      loginWithPassword: vi.fn(),
    };

    router = {
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not submit invalid form values', async () => {
    await component.submit();
    fixture.detectChanges();

    expect(authService.loginWithPassword).not.toHaveBeenCalled();
    expect(textContent()).toContain('Email is required.');
    expect(textContent()).toContain('Password is required.');
  });

  it('submits credentials through AuthService and navigates home on success', async () => {
    authService.loginWithPassword.mockResolvedValue({ ok: true, status: 200, message: null });

    component.loginForm.setValue({
      email: 'abid@example.com',
      password: 'secret',
    });

    await component.submit();

    expect(authService.loginWithPassword).toHaveBeenCalledWith({
      email: 'abid@example.com',
      password: 'secret',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('shows backend errors without clearing entered credentials', async () => {
    authService.loginWithPassword.mockResolvedValue({
      ok: false,
      status: 401,
      message: 'Invalid Email Or Password',
    });

    component.loginForm.setValue({
      email: 'abid@example.com',
      password: 'wrong',
    });

    await component.submit();
    fixture.detectChanges();

    expect(textContent()).toContain('Invalid Email Or Password');
    expect(component.email.value).toBe('abid@example.com');
    expect(component.password.value).toBe('wrong');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('disables the submit button while login is pending', async () => {
    let resolveLogin: (value: { ok: boolean; status: number; message: string | null }) => void;
    authService.loginWithPassword.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );

    component.loginForm.setValue({
      email: 'abid@example.com',
      password: 'secret',
    });

    const submitPromise = component.submit();
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.submit-button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Logging in...');

    resolveLogin!({ ok: false, status: 401, message: 'Invalid Email Or Password' });
    await submitPromise;
  });

  function textContent(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
});
