import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { Signin } from './pages/signin/signin';

export const routes: Routes = [
  { path: 'login',
    component: Login },

  { path: 'dashboard',
    component: Dashboard },

  { path: 'signin',
    component: Signin },

  { path: '',
    pathMatch: 'full',
    redirectTo: 'login' },

  { path: '**',
    redirectTo: 'login' },
];
