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
    createProtocol: ReturnType<typeof vi.fn>;
    createProtocolVersion: ReturnType<typeof vi.fn>;
    createSubstance: ReturnType<typeof vi.fn>;
    downloadExamDocument: ReturnType<typeof vi.fn>;
    listLinks: ReturnType<typeof vi.fn>;
    listProtocolVersions: ReturnType<typeof vi.fn>;
    updateProtocol: ReturnType<typeof vi.fn>;
  };
  let authService: { currentUser: ReturnType<typeof vi.fn> };

  const professionalUser: AuthUser = {
    id: 'professional-1',
    name: 'Pro Atlas',
    email: 'pro@example.com',
    role: 'professional',
    active: true,
    verificationStatus: 'approved',
  };

  function selectCurrentProtocolVersion(component: OperationsPage): void {
    component.selectedProtocolVersion.set({
      id: 'version-1',
      protocolId: 'protocol-1',
      version: 1,
      createdBy: 'professional-1',
      changeReason: null,
      startDate: '2026-07-30T00:00:00.000Z',
      endDate: null,
      continuous: true,
      items: [
        {
          id: 'item-1',
          substanceId: 'substance-1',
          substanceSnapshot: { name: 'Creatina' },
          instructions: null,
          frequencyType: 'daily',
          weekDays: [],
          time: '08:00',
          startDate: null,
          endDate: null,
          active: true,
        },
      ],
      createdAt: '2026-07-30T00:00:00.000Z',
    });
  }

  beforeEach(async () => {
    operationsService = {
      createProtocol: vi.fn(() =>
        of({ success: true, data: { protocol: {}, currentVersion: {} } }),
      ),
      createProtocolVersion: vi.fn(() =>
        of({ success: true, data: { protocol: {}, currentVersion: {} } }),
      ),
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
      downloadExamDocument: vi.fn(() =>
        of(new Blob(['pdf'], { type: 'application/pdf' })),
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
      listProtocolVersions: vi.fn(() =>
        of({
          success: true,
          data: [
            {
              id: 'version-1',
              protocolId: 'protocol-1',
              version: 1,
              createdBy: 'professional-1',
              changeReason: null,
              startDate: '2026-07-30T00:00:00.000Z',
              endDate: null,
              continuous: true,
              items: [
                {
                  id: 'item-1',
                  substanceId: 'substance-1',
                  substanceSnapshot: { name: 'Creatina' },
                  instructions: null,
                  frequencyType: 'daily',
                  weekDays: [],
                  time: '08:00',
                  startDate: null,
                  endDate: null,
                  active: true,
                },
              ],
              createdAt: '2026-07-30T00:00:00.000Z',
            },
          ],
        }),
      ),
      updateProtocol: vi.fn(() =>
        of({ success: true, data: { protocol: {}, currentVersion: {} } }),
      ),
    };
    authService = { currentUser: vi.fn(() => professionalUser) };

    await TestBed.configureTestingModule({
      imports: [OperationsPage],
      providers: [
        { provide: OperationsService, useValue: operationsService },
        { provide: AuthService, useValue: authService },
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
    component.addProtocolItem();
    component.toggleSubstanceCreation(1);
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
    expect(component.protocolItems.at(1).controls.substanceId.value).toBe(
      'substance-1',
    );
    expect(component.protocolItems.at(0).controls.substanceId.value).toBe('');
    expect(component.substanceCreationOpen()).toBe(false);
    expect(component.successMessage()).toBe(
      'Item criado e selecionado no protocolo.',
    );
  });

  it('cancela a criação de substância sem trocar o item de destino', () => {
    const component = fixture.componentInstance;
    component.addProtocolItem();
    component.toggleSubstanceCreation(1, 'protocol');

    component.closeSubstanceCreation();

    expect(component.substanceCreationOpen()).toBe(false);
    expect(component.substanceCreationItemIndex()).toBeNull();
    expect(component.substanceCreationTarget()).toBe('protocol');
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

  it('envia múltiplos itens e dias semanais no protocolo', () => {
    const component = fixture.componentInstance;
    component.protocolForm.patchValue({
      athleteId: 'athlete-1',
      title: 'Protocolo múltiplo',
      startDate: '2026-08-01',
      continuous: true,
    });
    component.protocolItems.at(0).patchValue({
      substanceId: 'substance-1',
      frequencyType: 'daily',
    });
    component.addProtocolItem();
    component.protocolItems.at(1).patchValue({
      substanceId: 'substance-2',
      frequencyType: 'weekly',
      time: '09:00',
    });
    component.toggleProtocolWeekDay(1, 1, true);
    component.toggleProtocolWeekDay(1, 5, true);

    component.submitProtocol();

    expect(operationsService.createProtocol).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            substanceId: 'substance-1',
            frequencyType: 'daily',
            weekDays: [],
          }),
          expect.objectContaining({
            substanceId: 'substance-2',
            frequencyType: 'weekly',
            weekDays: [1, 5],
          }),
        ],
      }),
    );
  });

  it('não remove o último item do protocolo', () => {
    const component = fixture.componentInstance;

    component.removeProtocolItem(0);

    expect(component.protocolItems.length).toBe(1);
    expect(component.actionError()).toContain('ao menos um item');
  });

  it('cria versão com alteração de data sem enviar items', () => {
    const component = fixture.componentInstance;
    selectCurrentProtocolVersion(component);
    component.protocolVersionForm.patchValue({
      protocolId: 'protocol-1',
      startDate: '2026-08-02',
    });

    component.submitProtocolVersion();

    expect(operationsService.createProtocolVersion).toHaveBeenCalledWith(
      'protocol-1',
      {
        startDate: '2026-08-02T00:00:00.000Z',
      },
    );
  });

  it('rejeita versão sem alteração material no frontend', () => {
    const component = fixture.componentInstance;
    selectCurrentProtocolVersion(component);
    component.protocolVersionForm.patchValue({ protocolId: 'protocol-1' });

    component.submitProtocolVersion();

    expect(operationsService.createProtocolVersion).not.toHaveBeenCalled();
    expect(component.actionError()).toContain('alteração');
  });

  it('rejeita versão com a mesma data atual', () => {
    const component = fixture.componentInstance;
    selectCurrentProtocolVersion(component);
    component.protocolVersionForm.patchValue({
      protocolId: 'protocol-1',
      startDate: '2026-07-30',
    });

    component.submitProtocolVersion();

    expect(operationsService.createProtocolVersion).not.toHaveBeenCalled();
    expect(component.actionError()).toContain('alteração');
  });

  it('carrega e salva somente protocolo em rascunho pela ação da tabela', () => {
    const component = fixture.componentInstance;
    const draft = {
      id: 'protocol-1',
      athleteId: 'athlete-1',
      professionalId: 'professional-1',
      title: 'Rascunho original',
      objective: null,
      status: 'draft' as const,
      currentVersion: 1,
      startDate: '2026-07-30T00:00:00.000Z',
      endDate: null,
      continuous: true,
      activatedAt: null,
      pausedAt: null,
      closedAt: null,
      cancelledAt: null,
      createdAt: '2026-07-30T00:00:00.000Z',
      updatedAt: '2026-07-30T00:00:00.000Z',
    };

    component.editProtocol(draft);
    component.protocolForm.controls.title.setValue('Rascunho atualizado');
    component.submitProtocol();

    expect(operationsService.listProtocolVersions).toHaveBeenCalledWith(
      'protocol-1',
    );
    expect(operationsService.updateProtocol).toHaveBeenCalledWith(
      'protocol-1',
      expect.objectContaining({
        title: 'Rascunho atualizado',
        items: [
          expect.objectContaining({ substanceId: 'substance-1' }),
        ],
      }),
    );
  });

  it('não inicia edição direta de protocolo ativo', () => {
    const component = fixture.componentInstance;

    component.editProtocol({
      id: 'protocol-active',
      athleteId: 'athlete-1',
      professionalId: 'professional-1',
      title: 'Protocolo ativo',
      objective: null,
      status: 'active',
      currentVersion: 1,
      startDate: '2026-07-30T00:00:00.000Z',
      endDate: null,
      continuous: true,
      activatedAt: '2026-07-30T00:00:00.000Z',
      pausedAt: null,
      closedAt: null,
      cancelledAt: null,
      createdAt: '2026-07-30T00:00:00.000Z',
      updatedAt: '2026-07-30T00:00:00.000Z',
    });

    expect(operationsService.listProtocolVersions).not.toHaveBeenCalled();
    expect(component.editingProtocolId()).toBe('');
  });

  it('abre PDF de exame autenticado e revoga a URL temporária', () => {
    const createObjectURL = vi.fn(() => 'blob:exam-document');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
    const open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
    vi.useFakeTimers();
    const component = fixture.componentInstance;

    component.viewExamDocument({
      id: 'exam-1',
      athleteId: 'athlete-1',
      professionalId: 'professional-1',
      title: 'Hemograma',
      examDate: '2026-07-30T00:00:00.000Z',
      laboratory: null,
      results: [],
      document: {
        originalName: 'hemograma.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 512,
      },
      notes: null,
      archivedAt: null,
      createdBy: 'professional-1',
      createdAt: '2026-07-30T00:00:00.000Z',
      updatedAt: '2026-07-30T00:00:00.000Z',
    });

    expect(operationsService.downloadExamDocument).toHaveBeenCalledWith(
      'exam-1',
    );
    expect(createObjectURL).toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith(
      'blob:exam-document',
      '_blank',
      'noopener,noreferrer',
    );
    vi.advanceTimersByTime(60_000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:exam-document');
    vi.useRealTimers();
    open.mockRestore();
  });

  it('trata PDF privado inexistente sem expor detalhes internos', () => {
    operationsService.downloadExamDocument.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            error: new Blob(),
          }),
      ),
    );
    const component = fixture.componentInstance;

    component.viewExamDocument({
      id: 'exam-missing',
      athleteId: 'athlete-1',
      professionalId: null,
      title: 'Exame',
      examDate: '2026-07-30T00:00:00.000Z',
      laboratory: null,
      results: [],
      document: {
        originalName: 'exame.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 100,
      },
      notes: null,
      archivedAt: null,
      createdBy: 'athlete-1',
      createdAt: '2026-07-30T00:00:00.000Z',
      updatedAt: '2026-07-30T00:00:00.000Z',
    });

    expect(component.actionError()).toBe(
      'O arquivo ou registro não foi encontrado.',
    );
  });

  it('oculta permissões profissionais para perfil pendente', () => {
    authService.currentUser.mockReturnValue({
      ...professionalUser,
      verificationStatus: 'pending',
    });
    const component = fixture.componentInstance;

    expect(component.canCreateProtocol()).toBe(false);
    expect(component.canReviewCheckIns()).toBe(false);
    expect(component.canCreateAthleteRecord()).toBe(false);
  });

  it('mantém mutações de check-in e inventário exclusivas do atleta', () => {
    fixture.destroy();
    authService.currentUser.mockReturnValue({
      ...professionalUser,
      id: 'athlete-1',
      role: 'athlete',
      verificationStatus: undefined,
    });
    fixture = TestBed.createComponent(OperationsPage);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.canCreateAthleteOnly()).toBe(true);
    expect(component.canCreateProtocol()).toBe(false);
    expect(component.canReviewCheckIns()).toBe(false);
    expect(component.canCreateAthleteRecord()).toBe(true);
  });

  it('não concede controles clínicos profissionais ao admin', () => {
    fixture.destroy();
    authService.currentUser.mockReturnValue({
      ...professionalUser,
      id: 'admin-1',
      role: 'admin',
      verificationStatus: undefined,
    });
    fixture = TestBed.createComponent(OperationsPage);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.canAdmin()).toBe(true);
    expect(component.canCreateProtocol()).toBe(false);
    expect(component.canReviewCheckIns()).toBe(false);
    expect(component.canCreateAthleteRecord()).toBe(false);
  });
});
