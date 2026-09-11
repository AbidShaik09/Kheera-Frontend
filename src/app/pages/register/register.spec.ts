import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { Register } from './register';
import { AuthService } from '../../services/auth-service';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let authService: {
    requestSignupOtp: ReturnType<typeof vi.fn>;
    verifySignupOtp: ReturnType<typeof vi.fn>;
    completeSignup: ReturnType<typeof vi.fn>;
  };
  let router: {
    navigateByUrl: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authService = {
      requestSignupOtp: vi.fn(),
      verifySignupOtp: vi.fn(),
      completeSignup: vi.fn(),
    };

    router = {
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not request an OTP when the email is missing', async () => {
    await component.submitCurrentStep();
    fixture.detectChanges();

    expect(authService.requestSignupOtp).not.toHaveBeenCalled();
    expect(textContent()).toContain('Email is required.');
  });

  it('does not request an OTP when the email format is invalid', async () => {
    component.email.setValue('not-an-email');
    await component.submitCurrentStep();
    fixture.detectChanges();

    expect(authService.requestSignupOtp).not.toHaveBeenCalled();
    expect(textContent()).toContain('Enter a valid email address.');
  });

  it('requests an OTP and moves to step two with the backend success message', async () => {
    authService.requestSignupOtp.mockResolvedValue({
      ok: true,
      status: 200,
      message: 'OTP sent successfully',
    });
    component.email.setValue(' abid@example.com ');

    await component.submitCurrentStep();
    fixture.detectChanges();

    expect(authService.requestSignupOtp).toHaveBeenCalledWith({
      email: 'abid@example.com',
    });
    expect(component.currentStep()).toBe(2);
    expect(textContent()).toContain('Step 2/3');
    expect(textContent()).toContain('OTP sent successfully');
  });

  it('keeps the user on step one when the signup email backend rejects the request', async () => {
    authService.requestSignupOtp.mockResolvedValue({
      ok: false,
      status: 409,
      message: 'Email already exists',
    });
    component.email.setValue('abid@example.com');

    await component.submitCurrentStep();
    fixture.detectChanges();

    expect(component.currentStep()).toBe(1);
    expect(textContent()).toContain('Email already exists');
  });

  it('does not verify an invalid OTP', async () => {
    component.currentStep.set(2);
    component.email.setValue('abid@example.com');
    component.otp.setValue('123');

    await component.submitCurrentStep();
    fixture.detectChanges();

    expect(authService.verifySignupOtp).not.toHaveBeenCalled();
    expect(textContent()).toContain('Enter the 6 digit OTP.');
  });

  it('verifies the OTP and moves to the profile step', async () => {
    authService.verifySignupOtp.mockResolvedValue({
      ok: true,
      status: 200,
      message: 'OTP verified',
    });
    component.currentStep.set(2);
    component.email.setValue('abid@example.com');
    component.otp.setValue('123456');

    await component.submitCurrentStep();
    fixture.detectChanges();

    expect(authService.verifySignupOtp).toHaveBeenCalledWith({
      email: 'abid@example.com',
      otp: 123456,
    });
    expect(component.currentStep()).toBe(3);
    expect(textContent()).toContain('Step 3/3');
    expect(textContent()).toContain('OTP verified');
  });

  it('shows backend OTP validation errors without advancing', async () => {
    authService.verifySignupOtp.mockResolvedValue({
      ok: false,
      status: 400,
      message: 'Invalid OTP',
    });
    component.currentStep.set(2);
    component.email.setValue('abid@example.com');
    component.otp.setValue('123456');

    await component.submitCurrentStep();
    fixture.detectChanges();

    expect(component.currentStep()).toBe(2);
    expect(textContent()).toContain('Invalid OTP');
  });

  it('resends the OTP through the signup email endpoint', async () => {
    authService.requestSignupOtp.mockResolvedValue({
      ok: true,
      status: 200,
      message: 'OTP resent',
    });
    component.currentStep.set(2);
    component.email.setValue('abid@example.com');

    await component.resendOtp();
    fixture.detectChanges();

    expect(authService.requestSignupOtp).toHaveBeenCalledWith({
      email: 'abid@example.com',
    });
    expect(textContent()).toContain('OTP resent');
  });

  it('blocks account creation when passwords do not match', async () => {
    component.currentStep.set(3);
    component.email.setValue('abid@example.com');
    component.otp.setValue('123456');
    component.profileForm.setValue({
      name: 'Abid Shaik',
      password: 'strong-pass',
      confirmPassword: 'different-pass',
    });

    await component.submitCurrentStep();
    fixture.detectChanges();

    expect(authService.completeSignup).not.toHaveBeenCalled();
    expect(textContent()).toContain('Passwords do not match.');
  });

  it('creates the account and navigates home on success', async () => {
    authService.completeSignup.mockResolvedValue({
      ok: true,
      status: 200,
      message: null,
    });
    component.currentStep.set(3);
    component.email.setValue('abid@example.com');
    component.otp.setValue('123456');
    component.profileForm.setValue({
      name: ' Abid Shaik ',
      password: 'strong-pass',
      confirmPassword: 'strong-pass',
    });

    await component.submitCurrentStep();

    expect(authService.completeSignup).toHaveBeenCalledWith({
      email: 'abid@example.com',
      name: 'Abid Shaik',
      password: 'strong-pass',
      otp: 123456,
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('shows backend account creation errors without navigating', async () => {
    authService.completeSignup.mockResolvedValue({
      ok: false,
      status: 400,
      message: 'OTP expired',
    });
    component.currentStep.set(3);
    component.email.setValue('abid@example.com');
    component.otp.setValue('123456');
    component.profileForm.setValue({
      name: 'Abid Shaik',
      password: 'strong-pass',
      confirmPassword: 'strong-pass',
    });

    await component.submitCurrentStep();
    fixture.detectChanges();

    expect(textContent()).toContain('OTP expired');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  function textContent(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
});
