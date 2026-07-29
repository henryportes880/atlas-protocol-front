import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { Dashboard } from './features/dashboard/dashboard';
import { Home } from './features/home/home';
import { AppLayout } from './layout/app-layout/app-layout';

const loadOperationsPage = () =>
  import('./features/operations/operations-page').then(
    (module) => module.OperationsPage,
  );

export const routes: Routes = [
  { path: '', component: Home, pathMatch: 'full', title: 'Atlas Protocol' },
  { path: 'login', component: Login, canActivate: [guestGuard] },
  { path: 'register', component: Register, canActivate: [guestGuard] },
  {
    path: 'app',
    component: AppLayout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        component: Dashboard,
        data: {
          title: 'Visão geral',
          eyebrow: 'Painel Atlas',
          breadcrumb: 'Início',
        },
      },
      {
        path: 'links',
        loadComponent: loadOperationsPage,
        data: {
          title: 'Vínculos',
          eyebrow: 'Rede de cuidado',
          breadcrumb: 'Operação',
          module: 'links',
        },
      },
      {
        path: 'protocols',
        loadComponent: loadOperationsPage,
        data: {
          title: 'Protocolos',
          eyebrow: 'Prescrição',
          breadcrumb: 'Operação',
          module: 'protocols',
        },
      },
      {
        path: 'tracking',
        loadComponent: loadOperationsPage,
        data: {
          title: 'Tracking',
          eyebrow: 'Acompanhamento',
          breadcrumb: 'Rotina',
          module: 'tracking',
        },
      },
      {
        path: 'check-ins',
        loadComponent: loadOperationsPage,
        data: {
          title: 'Check-ins',
          eyebrow: 'Rotina semanal',
          breadcrumb: 'Rotina',
          module: 'check-ins',
        },
      },
      {
        path: 'exams',
        loadComponent: loadOperationsPage,
        data: {
          title: 'Exames',
          eyebrow: 'Documentos',
          breadcrumb: 'Saúde',
          module: 'exams',
        },
      },
      {
        path: 'progress',
        loadComponent: loadOperationsPage,
        data: {
          title: 'Evolução física',
          eyebrow: 'Antropometria',
          breadcrumb: 'Saúde',
          module: 'progress',
        },
      },
      {
        path: 'timeline',
        loadComponent: loadOperationsPage,
        data: {
          title: 'Timeline',
          eyebrow: 'Histórico',
          breadcrumb: 'Histórico',
          module: 'timeline',
        },
      },
      {
        path: 'inventory',
        loadComponent: loadOperationsPage,
        data: {
          title: 'Inventário',
          eyebrow: 'Estoque',
          breadcrumb: 'Rotina',
          module: 'inventory',
        },
      },
      {
        path: 'notifications',
        loadComponent: loadOperationsPage,
        data: {
          title: 'Notificações',
          eyebrow: 'Caixa de entrada',
          breadcrumb: 'Alertas',
          module: 'notifications',
        },
      },
      {
        path: 'admin',
        loadComponent: loadOperationsPage,
        data: {
          title: 'Administração',
          eyebrow: 'Governança',
          breadcrumb: 'Admin',
          module: 'admin',
        },
      },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];
