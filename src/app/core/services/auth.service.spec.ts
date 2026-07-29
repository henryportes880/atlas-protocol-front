import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
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
        {
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Inválido' },
        },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(service.getToken()).toBeNull();
    expect(service.currentUser()).toBeNull();
  });

  it('envia cadastro profissional como multipart e persiste status pendente', () => {
    const service = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    const document = new File(['%PDF-1.7'], 'comprovante.pdf', {
      type: 'application/pdf',
    });

    service
      .registerProfessional({
        name: 'Profissional Teste',
        email: 'pro@example.com',
        password: 'senha-segura',
        document,
      })
      .subscribe((response) => {
        expect(response.data.verification.status).toBe('pending');
      });

    const request = http.expectOne(
      `${environment.apiUrl}/auth/register-professional`,
    );
    const body = request.request.body as FormData;

    expect(request.request.method).toBe('POST');
    expect(body instanceof FormData).toBe(true);
    expect(body.get('name')).toBe('Profissional Teste');
    expect(body.get('email')).toBe('pro@example.com');
    expect(body.get('password')).toBe('senha-segura');
    const appendedDocument = body.get('document') as File;
    expect(appendedDocument.name).toBe('comprovante.pdf');
    expect(appendedDocument.type).toBe('application/pdf');

    request.flush({
      success: true,
      data: {
        user: {
          id: 'professional-id',
          name: 'Profissional Teste',
          email: 'pro@example.com',
          role: 'professional',
          active: true,
        },
        verification: {
          status: 'pending',
          submittedAt: '2026-07-29T12:00:00.000Z',
        },
        token: 'token-profissional',
      },
      message: 'Cadastro enviado para análise.',
    });

    expect(service.getToken()).toBe('token-profissional');
    expect(service.currentUser()).toMatchObject({
      id: 'professional-id',
      role: 'professional',
      verificationStatus: 'pending',
    });
  });
});
