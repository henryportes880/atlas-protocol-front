import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  const router = {
    url: '/app/dashboard',
    navigate: vi.fn(() => Promise.resolve(true)),
  };

  beforeEach(() => {
    localStorage.clear();
    router.url = '/app/dashboard';
    router.navigate.mockClear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Router, useValue: router },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
  });

  it('anexa Bearer token quando existe sessão', () => {
    localStorage.setItem('atlas_token', 'token-seguro');
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    http.get('/protected').subscribe();
    const request = controller.expectOne('/protected');

    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer token-seguro',
    );
    request.flush({});
  });

  it('não adiciona Authorization sem token', () => {
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    http.get('/public').subscribe();
    const request = controller.expectOne('/public');

    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('limpa a sessão e redireciona em 401 protegido', async () => {
    localStorage.setItem('atlas_token', 'token-expirado');
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    const auth = TestBed.inject(AuthService);

    http.get('/protected').subscribe({ error: () => undefined });
    controller
      .expectOne('/protected')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    await Promise.resolve();

    expect(auth.getToken()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/app/dashboard' },
    });
  });

  it('mantém a sessão em 403 de regra de negócio', () => {
    localStorage.setItem('atlas_token', 'token-valido');
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    const auth = TestBed.inject(AuthService);
    const logout = vi.spyOn(auth, 'logout');

    http.get('/forbidden').subscribe({ error: () => undefined });
    controller
      .expectOne('/forbidden')
      .flush({}, { status: 403, statusText: 'Forbidden' });

    expect(logout).not.toHaveBeenCalled();
    expect(auth.getToken()).toBe('token-valido');
  });
});
