import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable, firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthUser } from '../models/auth.model';
import { AuthService } from '../services/auth.service';
import { adminGuard } from './admin.guard';

describe('adminGuard', () => {
  const admin: AuthUser = {
    id: 'admin-id',
    name: 'Administrador',
    email: 'admin@example.com',
    role: 'admin',
    active: true,
  };
  const professional: AuthUser = {
    id: 'professional-id',
    name: 'Profissional',
    email: 'professional@example.com',
    role: 'professional',
    active: true,
    verificationStatus: 'approved',
  };
  const athlete: AuthUser = {
    id: 'athlete-id',
    name: 'Atleta',
    email: 'athlete@example.com',
    role: 'athlete',
    active: true,
  };
  const auth = {
    getToken: vi.fn<() => string | null>(),
    ensureSession: vi.fn<() => Observable<AuthUser | null>>(),
  };
  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/app/admin' } as RouterStateSnapshot;

  beforeEach(() => {
    auth.getToken.mockReset();
    auth.ensureSession.mockReset();
    auth.getToken.mockReturnValue('token');
    auth.ensureSession.mockReturnValue(of(admin));

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    });
  });

  it('permite acesso para administrador autenticado', async () => {
    const result = TestBed.runInInjectionContext(() =>
      adminGuard(route, state),
    );

    expect(
      await firstValueFrom(result as Observable<boolean | UrlTree>),
    ).toBe(true);
  });

  it.each([
    ['profissional', professional],
    ['atleta', athlete],
  ])('redireciona %s autenticado para o dashboard', async (_label, user) => {
    auth.ensureSession.mockReturnValue(of(user));

    const result = TestBed.runInInjectionContext(() =>
      adminGuard(route, state),
    );
    const resolved = await firstValueFrom(
      result as Observable<boolean | UrlTree>,
    );
    const router = TestBed.inject(Router);

    expect(resolved instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(resolved as UrlTree)).toBe('/app/dashboard');
  });

  it('redireciona usuário sem token para o login sem consultar a sessão', () => {
    auth.getToken.mockReturnValue(null);

    const result = TestBed.runInInjectionContext(() =>
      adminGuard(route, state),
    );
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe(
      '/login?returnUrl=%2Fapp%2Fadmin',
    );
    expect(auth.ensureSession).not.toHaveBeenCalled();
  });
});
