import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../services/auth-service';
import { ThemeService } from '../../services/theme';
import { NavbarLogo } from '../navbar-logo/navbar-logo';
import { Router } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-navbar',
  imports: [NavbarLogo, MatMenuModule, MatButtonModule, MatIconModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  readonly themeService = inject(ThemeService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly isLoggedIn = this.authService.isUserLoggedIn;
  readonly currentTheme = signal(this.themeService.getTheme());
  readonly toggleThemeText = computed(() => (this.currentTheme() === 'dark' ? 'Light' : 'Dark'));
  readonly themeIcon = computed(() =>
    this.currentTheme() === 'dark' ? 'light_mode' : 'dark_mode',
  );
  constructor() {
    effect(() => {
      const loggedIn = this.authService.isUserLoggedIn();
      this.authService.sessionEpoch();
      if (loggedIn) untracked(() => void this.authService.ensureCurrentUser());
    });
  }
  navButtonClicked(path: string): void {
    const segments = this.router.parseUrl(this.router.url).root.children['primary']?.segments;
    const space = segments?.[0]?.path === 'spaces' ? segments[1]?.path : undefined;
    void this.router.navigate(['/' + path], {
      queryParamsHandling: 'merge',
      queryParams: space ? { space, page: null } : {},
    });
  }
  toggleTheme(): void {
    this.themeService.toggleTheme();
    this.currentTheme.set(this.themeService.getTheme());
  }
  signOut(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
