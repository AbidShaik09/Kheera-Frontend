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
      {
        path: 'projects/:projectId/workflow',
        loadComponent: () =>
          import('./pages/workflow-settings/workflow-settings').then((m) => m.WorkflowSettings),
        data: { title: 'Project workflow' },
      },
      {
        path: 'spaces/:spaceId/projects/new',
        loadComponent: () =>
          import('./pages/project-editor/project-editor').then((m) => m.ProjectEditor),
        data: { title: 'Create project' },
      },
      {
        path: 'projects/:projectId/settings',
        loadComponent: () =>
          import('./pages/project-editor/project-editor').then((m) => m.ProjectEditor),
        data: { title: 'Project settings' },
      },
      {
        path: 'spaces/:spaceId/people',
        loadComponent: () => import('./pages/space-people/space-people').then((m) => m.SpacePeople),
        data: { title: 'People' },
      },
      {
        path: 'spaces/new',
        loadComponent: () => import('./pages/space-editor/space-editor').then((m) => m.SpaceEditor),
        data: { title: 'Create space' },
      },
      {
        path: 'spaces/:spaceId/settings',
        loadComponent: () => import('./pages/space-editor/space-editor').then((m) => m.SpaceEditor),
        data: { title: 'Space settings' },
      },
      {
        path: 'spaces/:spaceId',
        loadComponent: () =>
          import('./pages/space-details/space-details').then((m) => m.SpaceDetails),
        data: { title: 'Space' },
      },
      {
        path: 'projects/:projectId',
        loadComponent: () =>
          import('./pages/project-summary/project-summary').then((m) => m.ProjectSummaryPage),
        data: { title: 'Project' },
      },
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
