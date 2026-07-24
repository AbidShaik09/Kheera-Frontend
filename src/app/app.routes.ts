import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { authGuard } from './guards/auth-guard';
import { Profile } from './pages/profile/profile';
import { Settings } from './pages/settings/settings';
import { guestGuard } from './guards/guest-guard';

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
    canActivate: [guestGuard], // Ensure you have a guest guard to protect this route
  },
  {
    path: 'register',
    component: Register,
    canActivate: [guestGuard],
  },
  {
    path: '',
    component: Dashboard,
    canActivate: [authGuard], // Ensure you have an auth guard to protect this route
  },
  {
    path: 'profile',
    component: Profile,
    canActivate: [authGuard],
  },
  {
    path: 'settings',
    component: Settings,
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
