import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { vi } from 'vitest';

import { ForgotPassword } from './forgot-password';
import { AuthService } from '../../services/auth-service';

describe('ForgotPassword', () => {
  let component: ForgotPassword;
  let fixture: ComponentFixture<ForgotPassword>;
  let authService: {
    requestPasswordResetOtp: ReturnType<typeof vi.fn>;
    resetPassword: ReturnType<typeof vi.fn>;
  };
  let router: {
    navigateByUrl: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authService = {
      requestPasswordResetOtp: vi.fn(),
      resetPassword: vi.fn(),
    };

    router = {
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not request an OTP when the email is missing', async () => {
    await component.sendOtp();
    fixture.detectChanges();

    expect(authService.requestPasswordResetOtp).not.toHaveBeenCalled();
    expect(textContent()).toContain('Email is required.');
  });

  it('does not request an OTP when the email format is invalid', async () => {
    component.email.setValue('not-an-email');

    await component.sendOtp();
    fixture.detectChanges();

    expect(authService.requestPasswordResetOtp).not.toHaveBeenCalled();
    expect(textContent()).toContain('Enter a valid email address.');
  });

  it('requests a reset OTP and moves to the reset step with the backend message', async () => {
    authService.requestPasswordResetOtp.mockResolvedValue({
      ok: true,
      status: 200,
      message: 'OTP Has Been Sent To Your Email',
    });
    component.email.setValue(' abid@example.com ');

    await component.sendOtp();
    fixture.detectChanges();

    expect(authService.requestPasswordResetOtp).toHaveBeenCalledWith({
      email: 'abid@example.com',
    });
    expect(component.currentStep()).toBe(2);
    expect(textContent()).toContain('OTP Has Been Sent To Your Email');
  });

  it('shows backend reset OTP errors without advancing', async () => {
    authService.requestPasswordResetOtp.mockResolvedValue({
      ok: false,
      status: 400,
      message: 'Unable to send OTP',
    });
    component.email.setValue('abid@example.com');

    await component.sendOtp();
    fixture.detectChanges();

    expect(component.currentStep()).toBe(1);
    expect(textContent()).toContain('Unable to send OTP');
  });

  it('does not reset the password when the OTP is invalid', async () => {
    component.currentStep.set(2);
    component.email.setValue('abid@example.com');
    component.resetForm.setValue({
      otp: '123',
      password: 'new-strong-pass',
      confirmPassword: 'new-strong-pass',
    });

    await component.resetPassword();
    fixture.detectChanges();

    expect(authService.resetPassword).not.toHaveBeenCalled();
    expect(textContent()).toContain('Enter the 6 digit OTP.');
  });

  it('blocks reset when passwords do not match', async () => {
    component.currentStep.set(2);
    component.email.setValue('abid@example.com');
    component.resetForm.setValue({
      otp: '123456',
      password: 'new-strong-pass',
      confirmPassword: 'different-pass',
    });

    await component.resetPassword();
    fixture.detectChanges();

    expect(authService.resetPassword).not.toHaveBeenCalled();
    expect(textContent()).toContain('Passwords do not match.');
  });

  it('resets the password and navigates home on success', async () => {
    authService.resetPassword.mockResolvedValue({
      ok: true,
      status: 200,
      message: null,
    });
    component.currentStep.set(2);
    component.email.setValue('abid@example.com');
    component.resetForm.setValue({
      otp: '123456',
      password: 'new-strong-pass',
      confirmPassword: 'new-strong-pass',
    });

    await component.resetPassword();

    expect(authService.resetPassword).toHaveBeenCalledWith({
      email: 'abid@example.com',
      password: 'new-strong-pass',
      otp: 123456,
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('shows backend reset errors without navigating', async () => {
    authService.resetPassword.mockResolvedValue({
      ok: false,
      status: 400,
      message: 'Invalid OTP',
    });
    component.currentStep.set(2);
    component.email.setValue('abid@example.com');
    component.resetForm.setValue({
      otp: '123456',
      password: 'new-strong-pass',
      confirmPassword: 'new-strong-pass',
    });

    await component.resetPassword();
    fixture.detectChanges();

    expect(textContent()).toContain('Invalid OTP');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('resends the OTP through the forgot-password endpoint', async () => {
    authService.requestPasswordResetOtp.mockResolvedValue({
      ok: true,
      status: 200,
      message: 'OTP resent',
    });
    component.currentStep.set(2);
    component.email.setValue('abid@example.com');

    await component.resendOtp();
    fixture.detectChanges();

    expect(authService.requestPasswordResetOtp).toHaveBeenCalledWith({
      email: 'abid@example.com',
    });
    expect(component.currentStep()).toBe(2);
    expect(textContent()).toContain('OTP resent');
  });

  function textContent(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
});
