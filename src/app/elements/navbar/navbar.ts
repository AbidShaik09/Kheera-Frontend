import { Component, computed, inject, signal, WritableSignal } from '@angular/core';
import { AuthService } from '../../services/auth-service';
import { ThemeService } from '../../services/theme';
import { NavbarLogo } from '../navbar-logo/navbar-logo';
import { GlobalSearch } from '../global-search/global-search';
import { KnightBtn } from '../../components/knight-btn/knight-btn';
import { Router } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon, MatIconModule } from '@angular/material/icon';
@Component({
  selector: 'app-navbar',
  imports: [NavbarLogo, GlobalSearch, KnightBtn, MatMenuModule, MatButtonModule, MatIconModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  themeService = inject(ThemeService);
  authService = inject(AuthService);
  private router = inject(Router);
  readonly isLoggedIn: WritableSignal<boolean> = this.authService.isUserLoggedIn;
  currentTheme = signal<string>(this.themeService.getTheme());
  toggleThemeText = computed((): string => {
    return this.currentTheme() === 'dark' ? 'Light' : 'Dark';
  });
  createBtnClicked() {
    console.log('Create button clicked');
  }
  navButtonClicked(path: string) {
    this.router.navigate([`/${path}`]);
  }
  toggleTheme() {
    this.themeService.toggleTheme();
    this.currentTheme.set(this.themeService.getTheme());
  }
  themeIcon = computed(() => {
    console.log('Theme changed:', this.themeService.getTheme());
    return this.currentTheme() === 'dark' ? 'wb_sunny' : 'brightness_2';
  });
}
