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
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
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

  readonly loading = signal(true);
  readonly error = signal('');
  readonly dashboard = signal<DashboardData | null>(null);

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
        next: (response) => this.dashboard.set(response.data),
        error: (error: unknown) => {
          this.dashboard.set(null);
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

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const response = error.error as Partial<ApiErrorResponse> | null;
      const message = response?.error?.message;
      if (typeof message === 'string' && message.trim()) return message;
    }

    return 'Não foi possível carregar seu painel agora. Tente novamente.';
  }
}
