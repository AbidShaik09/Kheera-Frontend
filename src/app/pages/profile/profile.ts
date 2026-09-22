import { Component, effect, inject, untracked } from '@angular/core';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-profile',
  imports: [],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  readonly auth = inject(AuthService);
  constructor() {
    effect(() => {
      const loggedIn = this.auth.isUserLoggedIn();
      this.auth.sessionEpoch();
      if (loggedIn) untracked(() => void this.auth.ensureCurrentUser());
    });
  }
}
