import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  Router,
} from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthUser } from '../../core/models/auth.model';
import { AuthService } from '../../core/services/auth.service';
import { OperationsService } from '../../core/services/operations.service';
import { OperationsPage } from './operations-page';

describe('OperationsPage', () => {
  let fixture: ComponentFixture<OperationsPage>;
  let operationsService: {
    createSubstance: ReturnType<typeof vi.fn>;
    listLinks: ReturnType<typeof vi.fn>;
  };

  const professionalUser: AuthUser = {
    id: 'professional-1',
    name: 'Pro Atlas',
    email: 'pro@example.com',
    role: 'professional',
    active: true,
    verificationStatus: 'approved',
  };

  beforeEach(async () => {
    operationsService = {
      createSubstance: vi.fn(() =>
        of({
          success: true,
          data: {
            substance: {
              id: 'substance-1',
              name: 'Creatina',
              description: null,
              category: 'supplement',
              defaultUnit: 'g',
              active: true,
              createdBy: 'professional-1',
              createdAt: '2026-07-30T12:00:00.000Z',
              updatedAt: '2026-07-30T12:00:00.000Z',
            },
          },
        }),
      ),
      listLinks: vi.fn(() =>
        of({
          success: true,
          data: [
            {
              id: 'link-1',
              professionalId: 'professional-1',
              athleteId: 'athlete-1',
              athlete: {
  id: 'athlete-1',
  name: 'Rafael Atleta Demo',
  email: 'atleta.demo@atlasprotocol.com',
},
              status: 'active',
              requestedAt: '2026-07-29T12:00:00.000Z',
              acceptedAt: '2026-07-29T12:10:00.000Z',
              rejectedAt: null,
              endedAt: null,
              endedBy: null,
              createdAt: '2026-07-29T12:00:00.000Z',
              updatedAt: '2026-07-29T12:10:00.000Z',
            },
          ],
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [OperationsPage],
      providers: [
        { provide: OperationsService, useValue: operationsService },
        { provide: AuthService, useValue: { currentUser: vi.fn(() => professionalUser) } },
        {
  provide: Router,
  useValue: {
    navigate: vi.fn(),
  },
},
        {
  provide: ActivatedRoute,
  useValue: {
    data: of({ module: 'links' }),
    queryParamMap: of(
      convertToParamMap({}),
    ),
  },
},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OperationsPage);
    fixture.detectChanges();
  });

  it('carrega o módulo de vínculos usando dados da rota', () => {
    const content = fixture.nativeElement.textContent;

    expect(operationsService.listLinks).toHaveBeenCalledWith({ limit: 20, status: '' });
    expect(
  operationsService.listLinks,
).toHaveBeenCalledWith({
  status: 'active',
  page: 1,
  limit: 100,
});
    expect(content).toContain('Vínculos');
    expect(content).toContain('Rafael Atleta Demo');
  });

  it('adiciona e seleciona o novo item sem recarregar a página', () => {
    const component = fixture.componentInstance;
    component.substanceCreationOpen.set(true);
    component.newSubstanceForm.setValue({
      name: 'Creatina',
      description: '',
      category: 'supplement',
      defaultUnit: 'g',
    });

    component.submitNewSubstance();

    expect(operationsService.createSubstance).toHaveBeenCalledWith({
      name: 'Creatina',
      description: null,
      category: 'supplement',
      defaultUnit: 'g',
    });
    expect(component.substances().map((item) => item.id)).toContain(
      'substance-1',
    );
    expect(component.protocolForm.controls.substanceId.value).toBe(
      'substance-1',
    );
    expect(component.substanceCreationOpen()).toBe(false);
    expect(component.successMessage()).toBe(
      'Item criado e selecionado no protocolo.',
    );
  });

  it('exibe a mensagem de erro retornada pela API ao criar item', () => {
    operationsService.createSubstance.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              success: false,
              error: {
                code: 'DUPLICATE_RESOURCE',
                message: 'Já existe uma substância com este nome.',
                fields: [],
              },
            },
          }),
      ),
    );
    const component = fixture.componentInstance;
    component.newSubstanceForm.setValue({
      name: 'Creatina',
      description: '',
      category: 'supplement',
      defaultUnit: '',
    });

    component.submitNewSubstance();

    expect(component.actionError()).toBe(
      'Já existe uma substância com este nome.',
    );
  });
});
