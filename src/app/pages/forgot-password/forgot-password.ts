import { Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';

type ResetStep = 1 | 2;

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentStep = signal<ResetStep>(1);
  readonly isSubmitting = signal(false);
  readonly serverMessage = signal<string | null>(null);
  readonly serverError = signal<string | null>(null);

  readonly emailForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  readonly resetForm = new FormGroup(
    {
      otp: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
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

  readonly submitText = computed(() =>
    this.isSubmitting()
      ? this.currentStep() === 1
        ? 'Sending OTP...'
        : 'Resetting password...'
      : this.currentStep() === 1
        ? 'Send OTP'
        : 'Reset Password',
  );

  get email() {
    return this.emailForm.controls.email;
  }

  get otp() {
    return this.resetForm.controls.otp;
  }

  get password() {
    return this.resetForm.controls.password;
  }

  get confirmPassword() {
    return this.resetForm.controls.confirmPassword;
  }

  async sendOtp(): Promise<void> {
    this.clearMessages();
    this.email.setValue(this.email.value.trim(), { emitEvent: false });
    this.emailForm.markAllAsTouched();

    if (this.emailForm.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    const result = await this.authService.requestPasswordResetOtp({ email: this.email.value });
    this.isSubmitting.set(false);

    if (result.ok) {
      this.serverMessage.set(result.message ?? 'OTP has been sent to your email.');
      this.currentStep.set(2);
      return;
    }

    this.serverError.set(result.message ?? 'Unable to send reset OTP. Please try again.');
  }

  async resetPassword(): Promise<void> {
    this.clearMessages();
    this.resetForm.markAllAsTouched();

    if (this.resetForm.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    const result = await this.authService.resetPassword({
      email: this.email.value,
      password: this.password.value,
      otp: Number(this.otp.value),
    });
    this.isSubmitting.set(false);

    if (result.ok) {
      await this.router.navigateByUrl('/');
      return;
    }

    this.serverError.set(result.message ?? 'Unable to reset password. Please try again.');
  }

  async resendOtp(): Promise<void> {
    await this.sendOtp();
  }

  emailError(): string | null {
    if (!this.email.touched || this.email.valid) return null;
    if (this.email.hasError('required')) return 'Email is required.';
    if (this.email.hasError('email')) return 'Enter a valid email address.';
    return null;
  }

  otpError(): string | null {
    if (!this.otp.touched || this.otp.valid) return null;
    if (this.otp.hasError('required')) return 'OTP is required.';
    if (this.otp.hasError('pattern')) return 'Enter the 6 digit OTP.';
    return null;
  }

  passwordError(): string | null {
    if (!this.password.touched || this.password.valid) return null;
    if (this.password.hasError('required')) return 'Password is required.';
    if (this.password.hasError('minlength')) return 'Password must be at least 8 characters.';
    return null;
  }

  confirmPasswordError(): string | null {
    if (!this.confirmPassword.touched) return null;
    if (this.confirmPassword.hasError('required')) return 'Confirm your password.';
    if (this.resetForm.hasError('passwordMismatch')) return 'Passwords do not match.';
    return null;
  }

  private clearMessages(): void {
    this.serverError.set(null);
    this.serverMessage.set(null);
  }
}

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  return password && confirmPassword && password !== confirmPassword
    ? { passwordMismatch: true }
    : null;
}
