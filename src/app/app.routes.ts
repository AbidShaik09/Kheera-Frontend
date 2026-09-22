import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { authGuard } from './guards/auth-guard';
import { Profile } from './pages/profile/profile';
import { Settings } from './pages/settings/settings';
import { guestGuard } from './guards/guest-guard';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { Landing } from './pages/landing/landing';
import { WorkspaceShell } from './components/workspace-shell/workspace-shell';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: Landing,
    canActivate: [guestGuard],
  },
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
    path: 'forgot-password',
    component: ForgotPassword,
    canActivate: [guestGuard],
  },
  {
    path: '',
    component: WorkspaceShell,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: 'dashboard', component: Dashboard, data: { title: 'Dashboard' } },
      { path: 'profile', component: Profile, data: { title: 'Profile' } },
      { path: 'settings', component: Settings, data: { title: 'Settings' } },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
