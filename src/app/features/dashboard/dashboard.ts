import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { finalize } from 'rxjs';
import { ApiErrorResponse } from '../../core/models/api.model';
import {
  ActivityType,
  AdminDashboardData,
  AthleteDashboardData,
  CheckInStatus,
  DashboardData,
  ProfessionalDashboardData,
  ProfessionalVerificationStatus,
  TrackingType,
} from '../../core/models/dashboard.model';
import { ProfessionalVerification } from '../../core/models/professional-verification.model';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { ProfessionalVerificationService } from '../../core/services/professional-verification.service';
import { AtlasIcon } from '../../shared/ui/atlas-icon/atlas-icon';

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: 'short',
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
});

const CHECK_IN_LABELS: Record<CheckInStatus, string> = {
  pending: 'Pendente',
  submitted: 'Enviado — aguardando revisão',
  reviewed: 'Revisado',
};

const TRACKING_TYPE_LABELS: Record<TrackingType, string> = {
  scheduled: 'Agendado',
  manual: 'Manual',
};

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  protocol: 'Protocolo',
  tracking: 'Acompanhamento',
  check_in: 'Check-in',
};

const VERIFICATION_LABELS: Record<ProfessionalVerificationStatus, string> = {
  approved: 'Aprovado',
  pending: 'Aguardando aprovação',
  rejected: 'Cadastro rejeitado',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AtlasIcon],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit {
  readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly professionalVerificationService = inject(
    ProfessionalVerificationService,
  );

  readonly loading = signal(true);
  readonly error = signal('');
  readonly dashboard = signal<DashboardData | null>(null);
  readonly professionalVerification = signal<ProfessionalVerification | null>(
    null,
  );
  readonly professionalVerificationLoading = signal(false);
  readonly professionalVerificationError = signal('');
  readonly professionalDocumentLoading = signal(false);

  readonly athleteDashboard = computed<AthleteDashboardData | null>(() => {
    const dashboard = this.dashboard();
    return dashboard?.role === 'athlete' ? dashboard : null;
  });

  readonly professionalDashboard =
    computed<ProfessionalDashboardData | null>(() => {
      const dashboard = this.dashboard();
      return dashboard?.role === 'professional' ? dashboard : null;
    });

  readonly adminDashboard = computed<AdminDashboardData | null>(() => {
    const dashboard = this.dashboard();
    return dashboard?.role === 'admin' ? dashboard : null;
  });

  readonly firstName = computed(() => {
    const name = this.auth.currentUser()?.name.trim();
    return name?.split(/\s+/)[0] || 'Atleta';
  });

  readonly hasProfessionalDashboard = computed(
    () => this.professionalDashboard()?.verificationStatus === 'approved',
  );

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    if (this.loading() && this.dashboard()) return;

    this.loading.set(true);
    this.error.set('');

    this.dashboardService
      .getDashboard()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.dashboard.set(response.data);
          this.loadProfessionalVerification(response.data);
        },
        error: (error: unknown) => {
          this.dashboard.set(null);
          this.professionalVerification.set(null);
          this.error.set(this.resolveErrorMessage(error));
        },
      });
  }

  formatDate(value: string | null): string {
    return this.formatWith(DATE_FORMATTER, value);
  }

  formatDateTime(value: string | null): string {
    return this.formatWith(DATE_TIME_FORMATTER, value);
  }

  checkInLabel(status: CheckInStatus): string {
    return CHECK_IN_LABELS[status];
  }

  trackingTypeLabel(type: TrackingType): string {
    return TRACKING_TYPE_LABELS[type];
  }

  activityTypeLabel(type: ActivityType): string {
    return ACTIVITY_TYPE_LABELS[type];
  }

  verificationLabel(status: ProfessionalVerificationStatus): string {
    return VERIFICATION_LABELS[status];
  }

  viewOwnProfessionalDocument(): void {
    const verification = this.professionalVerification();
    const document = verification?.verificationDocument;
    if (!verification || !document || this.professionalDocumentLoading()) return;

    this.professionalDocumentLoading.set(true);
    this.professionalVerificationError.set('');
    this.professionalVerificationService
      .downloadDocument(verification.id)
      .pipe(finalize(() => this.professionalDocumentLoading.set(false)))
      .subscribe({
        next: (blob) => {
          const objectUrl = URL.createObjectURL(blob);
          const openedWindow = window.open(
            objectUrl,
            '_blank',
            'noopener,noreferrer',
          );
          if (!openedWindow) {
            const link = window.document.createElement('a');
            link.href = objectUrl;
            link.download = document.originalName;
            link.click();
          }
          window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        },
        error: (error: unknown) => {
          this.professionalVerificationError.set(
            this.resolveErrorMessage(error),
          );
        },
      });
  }

  statusLabel(status: string | null): string {
    if (!status) return 'Sem status';
    return this.formatCodeLabel(status);
  }

  professionalStatusDescription(
    status: ProfessionalVerificationStatus,
  ): string {
    if (status === 'pending') {
      return 'Sua conta foi validada, mas a verificação profissional ainda está em análise. Os dados operacionais serão liberados assim que esse processo for concluído.';
    }

    if (status === 'rejected') {
      return 'Seu cadastro profissional foi recusado na verificação atual. Enquanto isso, o painel permanece em modo seguro, sem expor dados de atletas.';
    }

    return 'Seu perfil está habilitado para visualizar a operação completa do Atlas Protocol.';
  }

  shortId(value: string | null): string {
    if (!value) return 'Não informado';
    if (value.length <= 10) return value;
    return `${value.slice(0, 6)}…${value.slice(-4)}`;
  }

  codeLabel(value: string): string {
    return this.formatCodeLabel(value);
  }

  bytesLabel(value: number | null | undefined): string {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return 'Tamanho indisponível';
    }

    if (value < 1024 * 1024) {
      return `${Math.max(1, Math.round(value / 1024))} KB`;
    }

    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  private loadProfessionalVerification(dashboard: DashboardData): void {
    if (
      dashboard.role !== 'professional' ||
      dashboard.verificationStatus === 'approved'
    ) {
      this.professionalVerification.set(null);
      this.professionalVerificationError.set('');
      return;
    }

    this.professionalVerificationLoading.set(true);
    this.professionalVerificationError.set('');

    this.professionalVerificationService
      .getOwnVerification()
      .pipe(finalize(() => this.professionalVerificationLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.professionalVerification.set(response.data.verification);
        },
        error: (error: unknown) => {
          this.professionalVerification.set(null);
          this.professionalVerificationError.set(
            this.resolveErrorMessage(error),
          );
        },
      });
  }

  private formatWith(
    formatter: Intl.DateTimeFormat,
    value: string | null,
  ): string {
    if (!value) return 'Não informado';

    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Data indisponível'
      : formatter.format(date);
  }

  private formatCodeLabel(value: string): string {
    const normalized = value
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .trim()
      .toLowerCase();

    if (!normalized) return 'Sem informação';

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const response = error.error as Partial<ApiErrorResponse> | null;
      const message = response?.error?.message;
      if (typeof message === 'string' && message.trim()) return message;
      if (error.status === 401) return 'Sua sessão expirou. Entre novamente.';
      if (error.status === 403) return 'Você não possui permissão para acessar este documento.';
      if (error.status === 404) return 'O documento não foi encontrado.';
    }

    return 'Não foi possível carregar seu painel agora. Tente novamente.';
  }
}
