import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiSuccess } from '../../core/models/api.model';
import { AuthUser } from '../../core/models/auth.model';
import {
  AdminDashboardData,
  AthleteDashboardData,
  ProfessionalDashboardData,
} from '../../core/models/dashboard.model';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { ProfessionalVerificationService } from '../../core/services/professional-verification.service';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let dashboardService: {
    getDashboard: ReturnType<typeof vi.fn>;
  };
  let authService: {
    currentUser: ReturnType<typeof vi.fn>;
  };
  let professionalVerificationService: {
    getOwnVerification: ReturnType<typeof vi.fn>;
  };

  const athleteUser: AuthUser = {
    id: 'athlete-1',
    name: 'Ana Atleta',
    email: 'ana@example.com',
    role: 'athlete',
    active: true,
  };

  const baseAthleteDashboard: AthleteDashboardData = {
    role: 'athlete',
    activeProtocol: {
      id: 'protocol-1',
      title: 'Preparação V1',
      status: 'active',
      professionalId: 'professional-1',
      currentVersion: 2,
      startDate: '2026-07-01T00:00:00.000Z',
      endDate: null,
      continuous: true,
      activatedAt: '2026-07-01T12:00:00.000Z',
    },
    nextTracking: {
      id: 'tracking-1',
      type: 'scheduled',
      title: 'Peso semanal',
      scheduledFor: '2026-07-30T12:00:00.000Z',
      status: 'scheduled',
      protocolId: 'protocol-1',
      professionalId: 'professional-1',
    },
    currentCheckIn: {
      id: 'check-in-1',
      professionalId: 'professional-1',
      protocolId: 'protocol-1',
      referenceWeek: '2026-07-27T00:00:00.000Z',
      status: 'pending',
      submittedAt: null,
      reviewedAt: null,
    },
    recentActivity: [
      {
        id: 'activity-1',
        type: 'tracking',
        title: 'Acompanhamento concluído',
        occurredAt: '2026-07-26T12:00:00.000Z',
        status: 'completed',
        entityId: 'tracking-2',
      },
    ],
    unreadNotifications: 0,
    inventoryAlerts: [],
  };

  const baseProfessionalDashboard: ProfessionalDashboardData = {
    role: 'professional',
    verificationStatus: 'approved',
    athleteCount: 2,
    activeProtocols: 1,
    pendingCheckIns: 1,
    upcomingTrackings: [
      {
        id: 'tracking-prof-1',
        athleteId: 'athlete-1',
        protocolId: 'protocol-1',
        title: 'Acompanhamento semanal',
        type: 'scheduled',
        scheduledFor: '2026-08-01T12:00:00.000Z',
        status: 'scheduled',
      },
    ],
    recentActivity: [
      {
        id: 'activity-prof-1',
        athleteId: 'athlete-1',
        type: 'tracking',
        title: 'Check-in revisado',
        occurredAt: '2026-07-28T12:00:00.000Z',
        status: 'completed',
        entityId: 'tracking-prof-1',
      },
    ],
  };

  const baseAdminDashboard: AdminDashboardData = {
    role: 'admin',
    users: {
      total: 8,
      active: 6,
      blocked: 1,
      byRole: {
        admin: 1,
        professional: 3,
        athlete: 4,
      },
    },
    professionalsPending: 2,
    activeLinks: 5,
    recentAudit: [
      {
        id: 'audit-1',
        actorId: 'admin-1',
        action: 'USER_BLOCKED',
        entityType: 'ProfessionalProfile',
        entityId: 'professional-9',
        createdAt: '2026-07-28T14:00:00.000Z',
      },
    ],
  };

  beforeEach(() => {
    dashboardService = {
      getDashboard: vi.fn(),
    };
    authService = {
      currentUser: vi.fn(() => athleteUser),
    };
    professionalVerificationService = {
      getOwnVerification: vi.fn(() =>
        of({
          success: true,
          data: {
            verification: {
              id: 'verification-1',
              userId: 'professional-1',
              verificationStatus: 'pending',
              submittedAt: '2026-07-29T12:00:00.000Z',
              reviewedAt: null,
              reviewedBy: null,
              createdAt: '2026-07-29T12:00:00.000Z',
              updatedAt: '2026-07-29T12:00:00.000Z',
              verificationDocument: {
                originalName: 'comprovante.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 512,
              },
            },
          },
        }),
      ),
    };
  });

  async function render(
    response: Observable<
      ApiSuccess<
        AthleteDashboardData | ProfessionalDashboardData | AdminDashboardData
      >
    >,
  ): Promise<void> {
    dashboardService.getDashboard.mockReturnValue(response);

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: DashboardService, useValue: dashboardService },
        { provide: AuthService, useValue: authService },
        {
          provide: ProfessionalVerificationService,
          useValue: professionalVerificationService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
  }

  function athleteResponse(
    data: AthleteDashboardData = baseAthleteDashboard,
  ): ApiSuccess<AthleteDashboardData> {
    return {
      success: true,
      data,
      message: 'Dashboard carregado com sucesso.',
    };
  }

  function professionalResponse(
    data: ProfessionalDashboardData = baseProfessionalDashboard,
  ): ApiSuccess<ProfessionalDashboardData> {
    return {
      success: true,
      data,
      message: 'Dashboard carregado com sucesso.',
    };
  }

  function adminResponse(
    data: AdminDashboardData = baseAdminDashboard,
  ): ApiSuccess<AdminDashboardData> {
    return {
      success: true,
      data,
      message: 'Dashboard carregado com sucesso.',
    };
  }

  it('exibe o estado de carregamento enquanto aguarda a API', async () => {
    await render(new Subject<ApiSuccess<AthleteDashboardData>>());

    expect(fixture.nativeElement.textContent).toContain('Preparando seu painel');
    expect(
      fixture.nativeElement.querySelector('[aria-busy="true"]'),
    ).not.toBeNull();
  });

  it('renderiza o dashboard real do atleta e a atividade recente', async () => {
    await render(of(athleteResponse()));
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('Preparação V1');
    expect(content).toContain('Versão');
    expect(content).toContain('Peso semanal');
    expect(content).toContain('Pendente');
    expect(content).toContain('Acompanhamento concluído');
  });

  it('exibe estados vazios quando protocolo, tracking e check-in não existem', async () => {
    await render(
      of(
        athleteResponse({
          ...baseAthleteDashboard,
          activeProtocol: null,
          nextTracking: null,
          currentCheckIn: null,
        }),
      ),
    );
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('Nenhum protocolo ativo');
    expect(content).toContain('Nenhum acompanhamento agendado');
    expect(content).toContain('Nenhum check-in nesta semana');
  });

  it.each([
    ['pending', null, null, 'Pendente'],
    ['submitted', '2026-07-27T12:00:00.000Z', null, 'Enviado — aguardando revisão'],
    [
      'reviewed',
      '2026-07-27T12:00:00.000Z',
      '2026-07-28T12:00:00.000Z',
      'Revisado',
    ],
  ] as const)(
    'traduz o status %s do check-in conforme o contrato',
    async (status, submittedAt, reviewedAt, expectedLabel) => {
      await render(
        of(
          athleteResponse({
            ...baseAthleteDashboard,
            currentCheckIn: {
              ...baseAthleteDashboard.currentCheckIn!,
              status,
              submittedAt,
              reviewedAt,
            },
          }),
        ),
      );
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(expectedLabel);
    },
  );

  it('não renderiza respostas nem comentário de revisão do check-in', async () => {
    const unsafeCheckIn = {
      ...baseAthleteDashboard.currentCheckIn!,
      responses: { sensitiveAnswer: 'CONTEUDO_SENSIVEL' },
      reviewComment: 'COMENTARIO_PRIVADO',
    };

    await render(
      of(
        athleteResponse({
          ...baseAthleteDashboard,
          currentCheckIn: unsafeCheckIn,
        }),
      ),
    );
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).not.toContain('CONTEUDO_SENSIVEL');
    expect(content).not.toContain('COMENTARIO_PRIVADO');
  });

  it('exibe erro e permite tentar novamente', async () => {
    dashboardService.getDashboard
      .mockReturnValueOnce(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 500,
              error: {
                success: false,
                error: {
                  code: 'INTERNAL_ERROR',
                  message: 'Não foi possível carregar o dashboard.',
                  fields: [],
                },
              },
            }),
        ),
      )
      .mockReturnValueOnce(of(athleteResponse()));

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: DashboardService, useValue: dashboardService },
        { provide: AuthService, useValue: authService },
        {
          provide: ProfessionalVerificationService,
          useValue: professionalVerificationService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Não foi possível carregar o dashboard.',
    );

    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();

    expect(dashboardService.getDashboard).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Preparação V1');
  });

  it('renderiza o dashboard completo do profissional aprovado', async () => {
    authService.currentUser.mockReturnValue({
      id: 'professional-1',
      name: 'Paulo Profissional',
      email: 'paulo@example.com',
      role: 'professional',
      active: true,
      verificationStatus: 'approved',
    });

    await render(of(professionalResponse()));
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('Operação profissional');
    expect(content).toContain('Aprovado');
    expect(content).toContain('Atletas vinculados');
    expect(content).toContain('Acompanhamento semanal');
    expect(content).toContain('Atividade sob sua gestão');
    expect(content).not.toContain('Protocolo ativo');
    expect(content).not.toContain('Preparação V1');
    expect(
      professionalVerificationService.getOwnVerification,
    ).not.toHaveBeenCalled();
  });

  it.each(['pending', 'rejected'] as const)(
    'mantém modo seguro para profissional %s',
    async (verificationStatus) => {
      authService.currentUser.mockReturnValue({
        id: 'professional-1',
        name: 'Paulo Profissional',
        email: 'paulo@example.com',
        role: 'professional',
        active: true,
        verificationStatus,
      });
      professionalVerificationService.getOwnVerification.mockReturnValue(
        of({
          success: true,
          data: {
            verification: {
              id: 'verification-1',
              userId: 'professional-1',
              verificationStatus,
              submittedAt: '2026-07-29T12:00:00.000Z',
              reviewedAt:
                verificationStatus === 'rejected'
                  ? '2026-07-30T12:00:00.000Z'
                  : null,
              reviewedBy:
                verificationStatus === 'rejected' ? 'admin-1' : null,
              createdAt: '2026-07-29T12:00:00.000Z',
              updatedAt: '2026-07-30T12:00:00.000Z',
              rejectionReason:
                verificationStatus === 'rejected'
                  ? 'Documento insuficiente.'
                  : undefined,
              verificationDocument: {
                originalName: 'comprovante.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 512,
              },
            },
          },
        }),
      );

      await render(
        of(
          professionalResponse({
            ...baseProfessionalDashboard,
            verificationStatus,
            athleteCount: 0,
            activeProtocols: 0,
            pendingCheckIns: 0,
            upcomingTrackings: [],
            recentActivity: [],
          }),
        ),
      );
      fixture.detectChanges();

      const content = fixture.nativeElement.textContent;
      expect(content).toContain('Seu acesso operacional ainda está restrito');
      expect(content).toContain(
        verificationStatus === 'pending'
          ? 'Aguardando aprovação'
          : 'Cadastro rejeitado',
      );
      expect(content).toContain('comprovante.pdf');
      expect(content).toContain('1 KB');
      if (verificationStatus === 'rejected') {
        expect(content).toContain('Documento insuficiente.');
      }
      expect(
        professionalVerificationService.getOwnVerification,
      ).toHaveBeenCalledTimes(1);
      expect(content).not.toContain('Atividade sob sua gestão');
      expect(content).not.toContain('Preparação V1');
    },
  );

  it('renderiza métricas e auditoria para admin sem dados de atleta', async () => {
    authService.currentUser.mockReturnValue({
      id: 'admin-1',
      name: 'Ada Admin',
      email: 'ada@example.com',
      role: 'admin',
      active: true,
    });

    await render(of(adminResponse()));
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('Usuários cadastrados');
    expect(content).toContain('Profissionais pendentes');
    expect(content).toContain('Eventos administrativos');
    expect(content).toContain('User blocked');
    expect(content).toContain('Professional profile');
    expect(content).not.toContain('Protocolo ativo');
    expect(content).not.toContain('Preparação V1');
  });
});
