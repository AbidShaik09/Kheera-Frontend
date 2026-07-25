import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from './api-service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiService = inject(ApiService);

  readonly isUserLoggedIn = signal(false);

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
    const result = await this.apiService.get('users/me');

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

  logout(): void {
    this.clearAccessToken();
    this.isUserLoggedIn.set(false);
  }
}
