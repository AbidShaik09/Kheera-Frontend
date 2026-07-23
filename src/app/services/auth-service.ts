import { Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  isUserLoggedIn: WritableSignal<boolean> = signal(false);
  setUserLoggedIn(status: boolean) {
    this.isUserLoggedIn.set(status);
  }
}
