import { Component, computed, inject, WritableSignal } from '@angular/core';
import { AuthService } from '../../services/auth-service';
import { ThemeService } from '../../services/theme';
import { Navigation, NavRouteType } from '../../components/navigation/navigation';

@Component({
  selector: 'app-navbar',
  imports: [Navigation],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  themeService = inject(ThemeService);
  authService = inject(AuthService);
  readonly isLoggedIn: WritableSignal<boolean> = this.authService.isUserLoggedIn;

  readonly routes = computed<NavRouteType[]>(() => {
    if (this.isLoggedIn()) {
      return [
        { name: 'Dashboard', link: '/dashboard' },
        { name: 'Profile', link: '/profile' },
        { name: 'Settings', link: '/settings' },
      ];
    }

    return [
      { name: 'Home', link: '/' },
      { name: 'Login', link: '/login' },
      { name: 'Register', link: '/register' },
    ];
  });
}
