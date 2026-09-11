import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from './api-service';

export interface LoginCredentials {
  email: string;
  password: string;
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

  accessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  setAccessToken(token: string): void {
    localStorage.setItem('accessToken', token);
  }

  clearAccessToken(): void {
    localStorage.removeItem('accessToken');
  }

  async loginStatus(): Promise<boolean> {
    if (!this.accessToken()) {
      this.logout();
      return false;
    }

    const result = await this.apiService.get<CurrentUser>('users/me');

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
    const result = await this.apiService.post<string>('auth/login', credentials);

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

  logout(): void {
    this.clearAccessToken();
    this.isUserLoggedIn.set(false);
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
