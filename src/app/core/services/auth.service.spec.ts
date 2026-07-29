import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

describe('AuthService session hydration', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
  });

  it('retorna sessão ausente sem chamar /auth/me', () => {
    const service = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    let result = 'pending';

    service.ensureSession().subscribe((user) => {
      result = user === null ? 'anonymous' : 'authenticated';
    });

    expect(result).toBe('anonymous');
    http.expectNone(`${environment.apiUrl}/auth/me`);
  });

  it('compartilha chamadas concorrentes e reutiliza a sessão validada', () => {
    localStorage.setItem('atlas_token', 'token-seguro');
    const service = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    const users: string[] = [];

    service.ensureSession().subscribe((user) => users.push(user?.id ?? ''));
    service.ensureSession().subscribe((user) => users.push(user?.id ?? ''));

    const request = http.expectOne(`${environment.apiUrl}/auth/me`);
    request.flush({
      success: true,
      data: {
        user: {
          id: 'athlete-id',
          name: 'Atleta Teste',
          email: 'athlete@example.com',
          role: 'athlete',
          active: true,
        },
      },
    });

    expect(users).toEqual(['athlete-id', 'athlete-id']);
    expect(service.currentUser()?.role).toBe('athlete');

    service.ensureSession().subscribe((user) => users.push(user?.id ?? ''));
    http.expectNone(`${environment.apiUrl}/auth/me`);
    expect(users).toEqual(['athlete-id', 'athlete-id', 'athlete-id']);
  });

  it('limpa sessão quando /auth/me retorna erro de autenticação', () => {
    localStorage.setItem('atlas_token', 'token-invalido');
    const service = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);

    service.ensureSession().subscribe({ error: () => undefined });
    http
      .expectOne(`${environment.apiUrl}/auth/me`)
      .flush(
        { success: false, error: { code: 'INVALID_TOKEN', message: 'Inválido' } },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(service.getToken()).toBeNull();
    expect(service.currentUser()).toBeNull();
  });
});
