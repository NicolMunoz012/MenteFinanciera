import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guard';
import { Alerts } from './pages/alerts/alerts';
import { Analysis } from './pages/analysis/analysis';
import { Categories } from './pages/categories/categories';
import { Dashboard } from './pages/dashboard/dashboard';
import { Goals } from './pages/goals/goals';
import { Login } from './pages/login/login';
import { NotFound } from './pages/not-found/not-found';
import { Reminders } from './pages/reminders/reminders';
import { Scanner } from './pages/scanner/scanner';
import { Search } from './pages/search/search';
import { Signin } from './pages/signin/signin';
import { Transactions } from './pages/transactions/transactions';

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
    canActivate: [guestGuard],
  },
  {
    path: 'signin',
    component: Signin,
    canActivate: [guestGuard],
  },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard],
  },
  {
    path: 'transactions',
    component: Transactions,
    canActivate: [authGuard],
  },
  {
    path: 'categorias',
    component: Categories,
    canActivate: [authGuard],
  },
  {
    path: 'metas',
    component: Goals,
    canActivate: [authGuard],
  },
  {
    path: 'analisis',
    component: Analysis,
    canActivate: [authGuard],
  },
  {
    path: 'escaner',
    component: Scanner,
    canActivate: [authGuard],
  },
  {
    path: 'recordatorios',
    component: Reminders,
    canActivate: [authGuard],
  },
  {
    path: 'alertas',
    component: Alerts,
    canActivate: [authGuard],
  },
  {
    path: 'buscar',
    component: Search,
    canActivate: [authGuard],
  },
  {
    path: '404',
    component: NotFound,
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: '**',
    component: NotFound,
  },
];
