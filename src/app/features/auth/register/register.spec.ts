import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../core/services/auth.service';
import { Register } from './register';

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  let component: Register;
  let auth: {
    register: ReturnType<typeof vi.fn>;
    registerProfessional: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(async () => {
    auth = {
      register: vi.fn(() =>
        of({
          success: true,
          data: {
            user: {
              id: 'athlete-1',
              name: 'Ana Atleta',
              email: 'ana@example.com',
              role: 'athlete',
              active: true,
            },
            token: 'token-atleta',
          },
        }),
      ),
      registerProfessional: vi.fn(() =>
        of({
          success: true,
          data: {
            user: {
              id: 'professional-1',
              name: 'Paulo Profissional',
              email: 'paulo@example.com',
              role: 'professional',
              active: true,
            },
            verification: {
              status: 'pending',
              submittedAt: '2026-07-29T12:00:00.000Z',
            },
            token: 'token-profissional',
          },
        }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
  });

  it('mantém o cadastro básico de atleta', () => {
    component.name = '  Ana Atleta  ';
    component.email = '  ana@example.com  ';
    component.password = 'senha-segura';

    component.submit();

    expect(auth.register).toHaveBeenCalledWith({
      name: 'Ana Atleta',
      email: 'ana@example.com',
      password: 'senha-segura',
    });
    expect(auth.registerProfessional).not.toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/app/dashboard');
  });

  it('exige PDF antes de chamar o cadastro profissional', () => {
    component.selectAccountType('professional');
    component.name = 'Paulo Profissional';
    component.email = 'paulo@example.com';
    component.password = 'senha-segura';

    component.submit();

    expect(component.documentError).toContain('PDF');
    expect(auth.registerProfessional).not.toHaveBeenCalled();
    expect(component.loading).toBe(false);
  });

  it('rejeita arquivo profissional que não é PDF', () => {
    const input = document.createElement('input');
    const file = new File(['texto'], 'comprovante.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', {
      value: { item: () => file },
    });

    component.selectDocument({ target: input } as unknown as Event);

    expect(component.documentFile).toBeNull();
    expect(component.documentError).toContain('PDF');
  });

  it('envia cadastro profissional com PDF válido', () => {
    const documentFile = new File(['%PDF-1.7'], 'comprovante.pdf', {
      type: 'application/pdf',
    });
    component.selectAccountType('professional');
    component.name = '  Paulo Profissional  ';
    component.email = '  paulo@example.com  ';
    component.password = 'senha-segura';
    component.documentFile = documentFile;

    component.submit();

    expect(auth.registerProfessional).toHaveBeenCalledWith({
      name: 'Paulo Profissional',
      email: 'paulo@example.com',
      password: 'senha-segura',
      document: documentFile,
    });
    expect(auth.register).not.toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/app/dashboard');
  });
});
