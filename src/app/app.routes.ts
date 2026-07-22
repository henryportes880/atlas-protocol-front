import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { Dashboard } from './features/dashboard/dashboard';
import { Home } from './features/home/home';
import { AppLayout } from './layout/app-layout/app-layout';
import { FeaturePlaceholder } from './shared/pages/feature-placeholder/feature-placeholder';

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
        component: Dashboard,
        pathMatch: 'full',
        data: { title: 'Visão geral', eyebrow: 'Painel Atlas', breadcrumb: 'Início' },
      },
      {
        path: 'protocols',
        component: FeaturePlaceholder,
        data: {
          title: 'Protocolos',
          eyebrow: 'Rotina',
          breadcrumb: 'Início / Protocolos',
          icon: 'flask',
          description: 'A gestão de protocolos será integrada em uma próxima etapa.',
        },
      },
      {
        path: 'tracking',
        component: FeaturePlaceholder,
        data: {
          title: 'Acompanhamento',
          eyebrow: 'Rotina',
          breadcrumb: 'Início / Acompanhamento',
          icon: 'activity',
          description: 'Os registros de acompanhamento serão organizados aqui em uma próxima etapa.',
        },
      },
      {
        path: 'check-ins',
        component: FeaturePlaceholder,
        data: {
          title: 'Check-ins',
          eyebrow: 'Rotina',
          breadcrumb: 'Início / Check-ins',
          icon: 'clipboard',
          description: 'A experiência de check-ins será integrada aqui em uma próxima etapa.',
        },
      },
      {
        path: 'substances',
        component: FeaturePlaceholder,
        data: {
          title: 'Substâncias',
          eyebrow: 'Biblioteca',
          breadcrumb: 'Início / Substâncias',
          icon: 'flask',
          description: 'A biblioteca será estruturada futuramente, sem alterar os contratos atuais.',
        },
      },
      {
        path: 'links',
        component: FeaturePlaceholder,
        data: {
          title: 'Vínculos',
          eyebrow: 'Gestão',
          breadcrumb: 'Início / Vínculos',
          icon: 'user',
          description: 'A gestão de vínculos será adicionada em uma próxima etapa.',
        },
      },
      {
        path: 'users',
        component: FeaturePlaceholder,
        data: {
          title: 'Usuários',
          eyebrow: 'Gestão',
          breadcrumb: 'Início / Usuários',
          icon: 'user',
          description: 'A administração de usuários será adicionada em uma próxima etapa.',
        },
      },
      {
        path: 'exams',
        component: FeaturePlaceholder,
        data: {
          title: 'Exames',
          eyebrow: 'Acompanhamento',
          breadcrumb: 'Início / Exames',
          icon: 'clipboard',
          description: 'A área de exames será integrada futuramente ao acompanhamento.',
        },
      },
      {
        path: 'inventory',
        component: FeaturePlaceholder,
        data: {
          title: 'Inventário',
          eyebrow: 'Gestão',
          breadcrumb: 'Início / Inventário',
          icon: 'clipboard',
          description: 'A organização do inventário será implementada em uma próxima etapa.',
        },
      },
      {
        path: 'notifications',
        component: FeaturePlaceholder,
        data: {
          title: 'Notificações',
          eyebrow: 'Comunicação',
          breadcrumb: 'Início / Notificações',
          icon: 'bell',
          description: 'A central de notificações será disponibilizada futuramente.',
        },
      },
      { path: '**', redirectTo: '' },
    ],
  },
  { path: '**', redirectTo: '' },
];
