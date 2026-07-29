import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';

describe('rotas autenticadas', () => {
  it('protege /app e redireciona para /app/dashboard', () => {
    const appRoute = routes.find((route) => route.path === 'app');
    const children = appRoute?.children ?? [];
    const root = children.find((route) => route.path === '');
    const dashboard = children.find((route) => route.path === 'dashboard');

    expect(appRoute?.canActivate?.length).toBe(1);
    expect(root?.redirectTo).toBe('dashboard');
    expect(dashboard?.component).toBeDefined();
  });

  it.each(['dashboard/athlete', 'dashboard/professional', 'dashboard/admin'])(
    'não define a rota antiga /app/%s',
    (path) => {
      const appRoute = routes.find((route) => route.path === 'app');
      expect(appRoute?.children?.some((route) => route.path === path)).toBe(
        false,
      );
    },
  );

  it.each([
    'links',
    'protocols',
    'tracking',
    'check-ins',
    'exams',
    'progress',
    'timeline',
    'inventory',
    'notifications',
    'admin',
  ])('define a rota operacional /app/%s', (path) => {
    const appRoute = routes.find((route) => route.path === 'app');
    const route = appRoute?.children?.find((child) => child.path === path);

    expect(route?.loadComponent).toBeDefined();
    expect(route?.data?.['module']).toBeDefined();
  });
});
