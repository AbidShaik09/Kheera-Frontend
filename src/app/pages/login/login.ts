import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isSubmitting = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly loginForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly canSubmit = computed(() => !this.isSubmitting());

  get email() {
    return this.loginForm.controls.email;
  }

  get password() {
    return this.loginForm.controls.password;
  }

  async submit(): Promise<void> {
    this.serverError.set(null);
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);

    const result = await this.authService.loginWithPassword(this.loginForm.getRawValue());

    this.isSubmitting.set(false);

    if (result.ok) {
      await this.router.navigateByUrl('/');
      return;
    }

    this.serverError.set(result.message ?? 'Unable to sign in. Please try again.');
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

  passwordError(): string | null {
    if (!this.password.touched || this.password.valid) {
      return null;
    }

    if (this.password.hasError('required')) {
      return 'Password is required.';
    }

    return null;
  }
}
