import { Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth-service';

type SignupStep = 1 | 2 | 3;

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentStep = signal<SignupStep>(1);
  readonly isSubmitting = signal(false);
  readonly serverMessage = signal<string | null>(null);
  readonly serverError = signal<string | null>(null);

  readonly emailForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  readonly otpForm = new FormGroup({
    otp: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
    }),
  });

  readonly profileForm = new FormGroup(
    {
      name: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(8)],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: passwordMatchValidator },
  );

  readonly submitText = computed(() => {
    if (this.isSubmitting()) {
      return this.currentStep() === 1
        ? 'Sending OTP...'
        : this.currentStep() === 2
          ? 'Verifying OTP...'
          : 'Creating account...';
    }

    return this.currentStep() === 1
      ? 'Send OTP'
      : this.currentStep() === 2
        ? 'Verify OTP'
        : 'Create New Account';
  });

  get email() {
    return this.emailForm.controls.email;
  }

  get otp() {
    return this.otpForm.controls.otp;
  }

  get name() {
    return this.profileForm.controls.name;
  }

  get password() {
    return this.profileForm.controls.password;
  }

  get confirmPassword() {
    return this.profileForm.controls.confirmPassword;
  }

  async submitCurrentStep(): Promise<void> {
    if (this.currentStep() === 1) {
      await this.sendOtp();
      return;
    }

    if (this.currentStep() === 2) {
      await this.verifyOtp();
      return;
    }

    await this.createAccount();
  }

  async sendOtp(): Promise<void> {
    this.clearMessages();
    this.email.setValue(this.email.value.trim(), { emitEvent: false });
    this.emailForm.markAllAsTouched();

    if (this.emailForm.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);

    const result = await this.authService.requestSignupOtp({
      email: this.email.value.trim(),
    });

    this.isSubmitting.set(false);

    if (result.ok) {
      this.serverMessage.set(result.message ?? 'OTP has been sent to your email.');
      this.currentStep.set(2);
      return;
    }

    this.serverError.set(result.message ?? 'Unable to send OTP. Please try again.');
  }

  async resendOtp(): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }

    this.clearMessages();
    this.isSubmitting.set(true);

    const result = await this.authService.requestSignupOtp({
      email: this.email.value.trim(),
    });

    this.isSubmitting.set(false);

    if (result.ok) {
      this.serverMessage.set(result.message ?? 'OTP has been resent to your email.');
      return;
    }

    this.serverError.set(result.message ?? 'Unable to resend OTP. Please try again.');
  }

  async verifyOtp(): Promise<void> {
    this.clearMessages();
    this.otpForm.markAllAsTouched();

    if (this.otpForm.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);

    const result = await this.authService.verifySignupOtp({
      email: this.email.value.trim(),
      otp: this.otpNumber(),
    });

    this.isSubmitting.set(false);

    if (result.ok) {
      this.serverMessage.set(result.message ?? 'OTP verified. Complete your account.');
      this.currentStep.set(3);
      return;
    }

    this.serverError.set(result.message ?? 'Invalid or expired OTP.');
  }

  async createAccount(): Promise<void> {
    this.clearMessages();
    this.profileForm.markAllAsTouched();

    if (this.profileForm.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);

    const result = await this.authService.completeSignup({
      email: this.email.value.trim(),
      name: this.name.value.trim(),
      password: this.password.value,
      otp: this.otpNumber(),
    });

    this.isSubmitting.set(false);

    if (result.ok) {
      await this.router.navigateByUrl('/');
      return;
    }

    this.serverError.set(result.message ?? 'Unable to create account. Please try again.');
  }

  emailError(): string | null {
    if (!this.email.touched || this.email.valid) {
      return null;
    }

    if (this.email.hasError('required')) {
      return 'Email is required.';
    }

    if (this.email.hasError('email')) {
      return 'Enter a valid email address.';
    }

    return null;
  }

  otpError(): string | null {
    if (!this.otp.touched || this.otp.valid) {
      return null;
    }

    if (this.otp.hasError('required')) {
      return 'OTP is required.';
    }

    if (this.otp.hasError('pattern')) {
      return 'Enter the 6 digit OTP.';
    }

    return null;
  }

  nameError(): string | null {
    if (!this.name.touched || this.name.valid) {
      return null;
    }

    if (this.name.hasError('required')) {
      return 'Name is required.';
    }

    if (this.name.hasError('minlength')) {
      return 'Name must be at least 2 characters.';
    }

    return null;
  }

  passwordError(): string | null {
    if (!this.password.touched || this.password.valid) {
      return null;
    }

    if (this.password.hasError('required')) {
      return 'Password is required.';
    }

    if (this.password.hasError('minlength')) {
      return 'Password must be at least 8 characters.';
    }

    return null;
  }

  confirmPasswordError(): string | null {
    if (!this.confirmPassword.touched) {
      return null;
    }

    if (this.confirmPassword.hasError('required')) {
      return 'Confirm your password.';
    }

    if (this.profileForm.hasError('passwordMismatch')) {
      return 'Passwords do not match.';
    }

    return null;
  }

  private clearMessages(): void {
    this.serverError.set(null);
    this.serverMessage.set(null);
  }

  private otpNumber(): number {
    return Number(this.otp.value);
  }
}

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  return password && confirmPassword && password !== confirmPassword
    ? { passwordMismatch: true }
    : null;
}
