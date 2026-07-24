import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  readonly isUserLoggedIn = signal(false);

  login() {
    this.isUserLoggedIn.set(true);
  }

  logout() {
    this.isUserLoggedIn.set(false);
  }
}
