import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { ApiService } from './api-service';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface EmailOtpRequest {
  email: string;
}

export interface OtpValidationRequest {
  email: string;
  otp: number;
}

export interface SignupRequest {
  email: string;
  name: string;
  password: string;
  otp: number;
}

export interface ResetPasswordRequest {
  email: string;
  password: string;
  otp: number;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthActionResult {
  ok: boolean;
  status: number;
  message: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiService = inject(ApiService);

  readonly isUserLoggedIn = signal(Boolean(this.accessToken()));
  readonly sessionEpoch = signal(0);

  constructor() {
    const invalidateExternalSession = (event: StorageEvent) => {
      if (event.storageArea !== localStorage || (event.key !== 'accessToken' && event.key !== null))
        return;
      // Another tab changed accounts or signed out. Hide this tab's old state;
      // do not delete the new shared token. A reload validates it through users/me.
      this.sessionEpoch.update((epoch) => epoch + 1);
      this.isUserLoggedIn.set(false);
    };
    window.addEventListener('storage', invalidateExternalSession);
    inject(DestroyRef).onDestroy(() =>
      window.removeEventListener('storage', invalidateExternalSession),
    );
  }

  accessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  setAccessToken(token: string): void {
    localStorage.setItem('accessToken', token);
    this.sessionEpoch.update((epoch) => epoch + 1);
  }

  clearAccessToken(): void {
    localStorage.removeItem('accessToken');
    this.sessionEpoch.update((epoch) => epoch + 1);
  }

  async loginStatus(): Promise<boolean> {
    const epoch = this.sessionEpoch();
    const token = this.accessToken();
    if (!this.accessToken()) {
      this.logout();
      return false;
    }

    const result = await this.apiService.get<CurrentUser>('users/me');

    if (epoch !== this.sessionEpoch() || token !== this.accessToken()) {
      return this.isUserLoggedIn();
    }

    if (result.ok) {
      this.isUserLoggedIn.set(true);
      return true;
    }

    this.logout();
    return false;
  }

  login(accessToken: string): void {
    this.setAccessToken(accessToken);
    this.isUserLoggedIn.set(true);
  }

  async loginWithPassword(credentials: LoginCredentials): Promise<AuthActionResult> {
    const result = await this.apiService.postText('auth/login', credentials);

    if (result.ok && typeof result.body === 'string' && result.body.trim().length > 0) {
      this.login(result.body.trim());

      return {
        ok: true,
        status: result.status,
        message: null,
      };
    }

    return {
      ok: false,
      status: result.status,
      message: this.extractErrorMessage(result.body) ?? 'Unable to sign in. Please try again.',
    };
  }

  async requestSignupOtp(request: EmailOtpRequest): Promise<AuthActionResult> {
    const result = await this.apiService.postText('auth/signup-email', request);
    return this.toMessageResult(result, 'Unable to send OTP. Please try again.');
  }

  async verifySignupOtp(request: OtpValidationRequest): Promise<AuthActionResult> {
    const result = await this.apiService.postText('auth/otp-validation', request);
    return this.toMessageResult(result, 'Unable to verify OTP. Please try again.');
  }

  async completeSignup(request: SignupRequest): Promise<AuthActionResult> {
    const result = await this.apiService.postText('auth/signup', request);

    if (result.ok && typeof result.body === 'string' && result.body.trim().length > 0) {
      this.login(result.body.trim());

      return {
        ok: true,
        status: result.status,
        message: null,
      };
    }

    return {
      ok: false,
      status: result.status,
      message:
        this.extractErrorMessage(result.body) ?? 'Unable to create account. Please try again.',
    };
  }

  async requestPasswordResetOtp(request: EmailOtpRequest): Promise<AuthActionResult> {
    const result = await this.apiService.postText('auth/forgot-password', request);
    return this.toMessageResult(result, 'Unable to send reset OTP. Please try again.');
  }

  async resetPassword(request: ResetPasswordRequest): Promise<AuthActionResult> {
    const result = await this.apiService.postText('auth/reset-password', request);

    if (result.ok && typeof result.body === 'string' && result.body.trim().length > 0) {
      this.login(result.body.trim());

      return {
        ok: true,
        status: result.status,
        message: null,
      };
    }

    return {
      ok: false,
      status: result.status,
      message:
        this.extractErrorMessage(result.body) ?? 'Unable to reset password. Please try again.',
    };
  }

  logout(): void {
    this.clearAccessToken();
    this.isUserLoggedIn.set(false);
  }

  private toMessageResult(
    result: { ok: boolean; status: number; body: unknown },
    fallbackMessage: string,
  ): AuthActionResult {
    const message = this.extractErrorMessage(result.body);

    return {
      ok: result.ok,
      status: result.status,
      message: message ?? (result.ok ? null : fallbackMessage),
    };
  }

  private extractErrorMessage(body: unknown): string | null {
    if (typeof body === 'string' && body.trim().length > 0) {
      return body;
    }

    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message?: unknown }).message;
      return typeof message === 'string' && message.trim().length > 0 ? message : null;
    }

    return null;
  }
}
