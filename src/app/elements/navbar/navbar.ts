import { Component, signal, WritableSignal } from '@angular/core';
import { AuthService } from '../../services/auth-service';
import { ThemeService } from '../../services/theme';
import { NavRouteType, Navigation } from '../../components/navigation/navigation';
@Component({
  selector: 'app-navbar',
  imports: [Navigation],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  isLoggedIn: WritableSignal<boolean>;
  routes: NavRouteType[];
  constructor(
    private readonly authService: AuthService,
    private readonly themeService: ThemeService,
  ) {
    this.isLoggedIn = signal(this.authService.isUserLoggedIn());
    console.log('Navbar initialized. User logged in:', this.isLoggedIn());
    console.log('Current theme:', this.themeService.getTheme());
    if (this.isLoggedIn()) {
      this.routes = [
        { name: 'Home', link: '/' },
        { name: 'Profile', link: '/profile' },
        { name: 'Settings', link: '/settings' },
      ];
    } else {
      this.routes = [
        { name: 'Home', link: '/' },
        { name: 'Login', link: '/login' },
        { name: 'Register', link: '/register' },
      ];
    }
  }
}
