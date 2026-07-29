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
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const athlete: AuthUser = {
    id: 'athlete-id',
    name: 'Atleta',
    email: 'athlete@example.com',
    role: 'athlete',
    active: true,
  };
  const auth = {
    getToken: vi.fn<() => string | null>(),
    ensureSession: vi.fn(() => of<AuthUser | null>(athlete)),
  };
  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/app/dashboard' } as RouterStateSnapshot;

  beforeEach(() => {
    auth.getToken.mockReset();
    auth.ensureSession.mockReset();
    auth.ensureSession.mockReturnValue(of(athlete));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    });
  });

  it('bloqueia acesso sem token e preserva returnUrl', () => {
    auth.getToken.mockReturnValue(null);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(route, state),
    );
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe(
      '/login?returnUrl=%2Fapp%2Fdashboard',
    );
    expect(auth.ensureSession).not.toHaveBeenCalled();
  });

  it('aguarda sessão válida antes de liberar a rota', async () => {
    auth.getToken.mockReturnValue('token');

    const result = TestBed.runInInjectionContext(() =>
      authGuard(route, state),
    );

    expect(
      await firstValueFrom(result as Observable<boolean | UrlTree>),
    ).toBe(true);
    expect(auth.ensureSession).toHaveBeenCalledTimes(1);
  });
});
