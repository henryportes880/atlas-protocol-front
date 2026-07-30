// Shared operational page driven by route data for the Atlas modules.
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  ActivatedRoute,
  Router,
} from '@angular/router';
import { finalize, forkJoin, Observable } from 'rxjs';

import { ApiErrorResponse, PaginatedResponse } from '../../core/models/api.model';
import { AuthUser } from '../../core/models/auth.model';
import {
  AdminProfessionalVerification,
  AuditLogRecord,
  CheckInRecord,
  ExamRecord,
  ExamResult,
  HistoryItem,
  InventoryItem,
  InventoryMovementType,
  InventoryUnit,
  JsonObject,
  LinkRecord,
  NotificationRecord,
  OperationQuery,
  OperationRecord,
  PageMeta,
  PhysicalProgressRecord,
  ProtocolRecord,
  ProtocolStatus,
  ProtocolVersionRecord,
  TrackingRecord,
  TrackingRecordStatus,
  TrackingRecordType,
  UserRecord,
} from '../../core/models/operations.model';
import { AuthService } from '../../core/services/auth.service';
import { OperationsService } from '../../core/services/operations.service';
import { AtlasIcon, AtlasIconName } from '../../shared/ui/atlas-icon/atlas-icon';

export type OperationModuleKey =
  | 'admin'
  | 'check-ins'
  | 'exams'
  | 'inventory'
  | 'links'
  | 'notifications'
  | 'progress'
  | 'protocols'
  | 'timeline'
  | 'tracking';

interface OperationModuleDefinition {
  key: OperationModuleKey;
  eyebrow: string;
  title: string;
  description: string;
  icon: AtlasIconName;
  emptyTitle: string;
  emptyDescription: string;
}

interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

const MODULE_DEFINITIONS: Record<OperationModuleKey, OperationModuleDefinition> = {
  admin: {
    key: 'admin',
    eyebrow: 'Governança',
    title: 'Administração',
    description:
      'Acompanhe usuários, aprovações profissionais e trilha de auditoria do Atlas.',
    icon: 'shield',
    emptyTitle: 'Sem registros administrativos',
    emptyDescription: 'Os dados administrativos aparecerão aqui conforme o uso.',
  },
  'check-ins': {
    key: 'check-ins',
    eyebrow: 'Rotina semanal',
    title: 'Check-ins',
    description:
      'Crie, envie e revise check-ins com respostas estruturadas por semana.',
    icon: 'clipboard',
    emptyTitle: 'Nenhum check-in encontrado',
    emptyDescription: 'Use os filtros ou registre um novo check-in semanal.',
  },
  exams: {
    key: 'exams',
    eyebrow: 'Documentos clínicos',
    title: 'Exames',
    description:
      'Registre exames, resultados e PDFs opcionais vinculados ao atleta.',
    icon: 'flask',
    emptyTitle: 'Nenhum exame cadastrado',
    emptyDescription: 'Os exames enviados aparecerão nesta central.',
  },
  inventory: {
    key: 'inventory',
    eyebrow: 'Estoque pessoal',
    title: 'Inventário',
    description:
      'Controle itens, alertas de estoque baixo, vencimentos e movimentações.',
    icon: 'info',
    emptyTitle: 'Nenhum item no inventário',
    emptyDescription: 'Cadastre itens para iniciar o controle de estoque.',
  },
  links: {
    key: 'links',
    eyebrow: 'Rede de cuidado',
    title: 'Vínculos',
    description:
      'Gerencie solicitações entre profissionais aprovados e atletas.',
    icon: 'user',
    emptyTitle: 'Nenhum vínculo encontrado',
    emptyDescription: 'Convites pendentes, ativos ou encerrados aparecerão aqui.',
  },
  notifications: {
    key: 'notifications',
    eyebrow: 'Caixa de entrada',
    title: 'Notificações',
    description:
      'Veja alertas gerados por protocolos, check-ins, exames e inventário.',
    icon: 'bell',
    emptyTitle: 'Nenhuma notificação',
    emptyDescription: 'Quando houver novidades, elas aparecem nesta caixa.',
  },
  progress: {
    key: 'progress',
    eyebrow: 'Antropometria',
    title: 'Evolução física',
    description:
      'Acompanhe peso, percentual de gordura, medidas corporais e observações.',
    icon: 'chart',
    emptyTitle: 'Nenhum registro de evolução',
    emptyDescription: 'Crie medições para acompanhar a linha de progresso.',
  },
  protocols: {
    key: 'protocols',
    eyebrow: 'Prescrição versionada',
    title: 'Protocolos e versões',
    description:
      'Liste protocolos, altere status e consulte histórico de versões.',
    icon: 'flask',
    emptyTitle: 'Nenhum protocolo encontrado',
    emptyDescription: 'Protocolos criados para atletas vinculados aparecerão aqui.',
  },
  timeline: {
    key: 'timeline',
    eyebrow: 'Histórico longitudinal',
    title: 'Timeline',
    description:
      'Uma linha do tempo consolidada com eventos relevantes do acompanhamento.',
    icon: 'activity',
    emptyTitle: 'Nenhum evento na timeline',
    emptyDescription: 'Eventos de protocolos, tracking e exames surgirão aqui.',
  },
  tracking: {
    key: 'tracking',
    eyebrow: 'Acompanhamento',
    title: 'Tracking',
    description:
      'Agende registros, conclua acompanhamentos e marque ausências ou cancelamentos.',
    icon: 'calendar',
    emptyTitle: 'Nenhum tracking encontrado',
    emptyDescription: 'Agendamentos e registros manuais aparecerão nesta tela.',
  },
};

const STATUS_OPTIONS: Partial<Record<OperationModuleKey, SelectOption[]>> = {
  'check-ins': [
    { value: 'pending', label: 'Pendente' },
    { value: 'submitted', label: 'Enviado' },
    { value: 'reviewed', label: 'Revisado' },
  ],
  links: [
    { value: 'pending', label: 'Pendente' },
    { value: 'active', label: 'Ativo' },
    { value: 'rejected', label: 'Rejeitado' },
    { value: 'ended', label: 'Encerrado' },
  ],
  protocols: [
    { value: 'draft', label: 'Rascunho' },
    { value: 'active', label: 'Ativo' },
    { value: 'paused', label: 'Pausado' },
    { value: 'closed', label: 'Fechado' },
    { value: 'cancelled', label: 'Cancelado' },
  ],
  tracking: [
    { value: 'scheduled', label: 'Agendado' },
    { value: 'completed', label: 'Concluído' },
    { value: 'missed', label: 'Perdido' },
    { value: 'cancelled', label: 'Cancelado' },
  ],
};

const TRACKING_TYPE_OPTIONS: SelectOption<TrackingRecordType>[] = [
  { value: 'scheduled', label: 'Agendado' },
  { value: 'manual', label: 'Manual' },
];

const INVENTORY_UNIT_OPTIONS: SelectOption<InventoryUnit>[] = [
  { value: 'unit', label: 'Unidade' },
  { value: 'tablet', label: 'Comprimido' },
  { value: 'capsule', label: 'Cápsula' },
  { value: 'mg', label: 'mg' },
  { value: 'g', label: 'g' },
  { value: 'ml', label: 'ml' },
  { value: 'vial', label: 'Frasco' },
  { value: 'box', label: 'Caixa' },
];

const INVENTORY_MOVEMENT_OPTIONS: SelectOption<InventoryMovementType>[] = [
  { value: 'in', label: 'Entrada' },
  { value: 'out', label: 'Saída' },
  { value: 'adjustment', label: 'Ajuste' },
];

const TRACKING_STATUS_OPTIONS: SelectOption<TrackingRecordStatus>[] = [
  { value: 'completed', label: 'Concluir' },
  { value: 'missed', label: 'Marcar perdido' },
  { value: 'cancelled', label: 'Cancelar' },
];

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

const MODULES_WITH_SEARCH = new Set<OperationModuleKey>([
  'admin',
  'inventory',
]);
const MODULES_WITH_STATUS = new Set<OperationModuleKey>([
  'check-ins',
  'links',
  'protocols',
  'tracking',
]);
const MODULES_WITH_TYPE = new Set<OperationModuleKey>([
  'timeline',
  'tracking',
]);
const MODULES_WITH_DATES = new Set<OperationModuleKey>([
  'check-ins',
  'exams',
  'progress',
  'protocols',
  'timeline',
  'tracking',
]);
const MODULES_WITH_ARCHIVED = new Set<OperationModuleKey>([
  'exams',
  'inventory',
  'notifications',
  'progress',
]);
const MODULES_WITH_ATHLETE_FILTER = new Set<OperationModuleKey>([
  'check-ins',
  'exams',
  'inventory',
  'progress',
  'protocols',
  'timeline',
  'tracking',
]);

@Component({
  selector: 'app-operations-page',
  standalone: true,
  imports: [ReactiveFormsModule, AtlasIcon],
  templateUrl: './operations-page.html',
  styleUrl: './operations-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationsPage {
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly operations = inject(OperationsService);

  readonly moduleKey = signal<OperationModuleKey>('links');
  readonly loading = signal(true);
  readonly actionLoading = signal(false);
  readonly error = signal('');
  readonly actionError = signal('');
  readonly successMessage = signal('');
  readonly records = signal<OperationRecord[]>([]);
  readonly professionalAthleteLinks =
  signal<LinkRecord[]>([]);
  
  readonly meta = signal<PageMeta | null>(null);
  readonly protocolVersions = signal<ProtocolVersionRecord[]>([]);
  readonly selectedProtocolId = signal('');
  readonly adminUsers = signal<UserRecord[]>([]);
  readonly adminVerifications = signal<AdminProfessionalVerification[]>([]);
  readonly adminAuditLogs = signal<AuditLogRecord[]>([]);
  readonly examDocument = signal<File | null>(null);
  readonly examDocumentError = signal('');

  readonly filtersForm = new FormGroup({
    archived: new FormControl('', { nonNullable: true }),
    athleteId: new FormControl('', { nonNullable: true }),
    dateFrom: new FormControl('', { nonNullable: true }),
    dateTo: new FormControl('', { nonNullable: true }),
    read: new FormControl('', { nonNullable: true }),
    search: new FormControl('', { nonNullable: true }),
    status: new FormControl('', { nonNullable: true }),
    type: new FormControl('', { nonNullable: true }),
  });

  readonly linkForm = new FormGroup({
    athleteEmail: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    reason: new FormControl('', { nonNullable: true }),
  });

  readonly protocolForm = new FormGroup({
    athleteId: new FormControl('', { nonNullable: true, validators: Validators.required }),
    continuous: new FormControl(true, { nonNullable: true }),
    endDate: new FormControl('', { nonNullable: true }),
    objective: new FormControl('', { nonNullable: true }),
    startDate: new FormControl(this.todayInputValue(), {
      nonNullable: true,
      validators: Validators.required,
    }),
    title: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });

  readonly protocolActionForm = new FormGroup({
    reason: new FormControl('', { nonNullable: true }),
  });

  readonly protocolVersionForm = new FormGroup({
    changeReason: new FormControl('', { nonNullable: true }),
    continuous: new FormControl(true, { nonNullable: true }),
    endDate: new FormControl('', { nonNullable: true }),
    protocolId: new FormControl('', { nonNullable: true, validators: Validators.required }),
    startDate: new FormControl('', { nonNullable: true }),
  });

  readonly trackingForm = new FormGroup({
    athleteId: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    protocolId: new FormControl('', { nonNullable: true }),
    scheduledFor: new FormControl(this.dateTimeInputValue(), {
      nonNullable: true,
      validators: Validators.required,
    }),
    title: new FormControl('', { nonNullable: true, validators: Validators.required }),
    type: new FormControl<TrackingRecordType>('scheduled', { nonNullable: true }),
  });

  readonly trackingActionForm = new FormGroup({
    completedAt: new FormControl(this.dateTimeInputValue(), { nonNullable: true }),
    id: new FormControl('', { nonNullable: true, validators: Validators.required }),
    notes: new FormControl('', { nonNullable: true }),
    reason: new FormControl('', { nonNullable: true }),
    status: new FormControl<TrackingRecordStatus>('completed', { nonNullable: true }),
  });

  readonly checkInForm = new FormGroup({
    professionalId: new FormControl('', { nonNullable: true }),
    protocolId: new FormControl('', { nonNullable: true }),
    referenceWeek: new FormControl(this.todayInputValue(), {
      nonNullable: true,
      validators: Validators.required,
    }),
    responsesJson: new FormControl('{\n  "observacoes": ""\n}', {
      nonNullable: true,
      validators: Validators.required,
    }),
  });

  readonly checkInReviewForm = new FormGroup({
    id: new FormControl('', { nonNullable: true, validators: Validators.required }),
    reviewComment: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
  });

  readonly examForm = new FormGroup({
    athleteId: new FormControl('', { nonNullable: true }),
    examDate: new FormControl(this.todayInputValue(), {
      nonNullable: true,
      validators: Validators.required,
    }),
    laboratory: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    resultsJson: new FormControl('[]', { nonNullable: true }),
    title: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });

  readonly progressForm = new FormGroup({
    armCm: new FormControl('', { nonNullable: true }),
    athleteId: new FormControl('', { nonNullable: true }),
    bodyFatPercent: new FormControl('', { nonNullable: true }),
    calfCm: new FormControl('', { nonNullable: true }),
    chestCm: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    referenceDate: new FormControl(this.todayInputValue(), {
      nonNullable: true,
      validators: Validators.required,
    }),
    thighCm: new FormControl('', { nonNullable: true }),
    waistCm: new FormControl('', { nonNullable: true }),
    weightKg: new FormControl('', { nonNullable: true }),
  });

  readonly inventoryForm = new FormGroup({
    expirationDate: new FormControl('', { nonNullable: true }),
    lowStockThreshold: new FormControl('', { nonNullable: true }),
    name: new FormControl('', { nonNullable: true, validators: Validators.required }),
    quantity: new FormControl('0', {
      nonNullable: true,
      validators: Validators.required,
    }),
    substanceId: new FormControl('', { nonNullable: true }),
    unit: new FormControl<InventoryUnit>('unit', { nonNullable: true }),
  });

  readonly inventoryMovementForm = new FormGroup({
    itemId: new FormControl('', { nonNullable: true, validators: Validators.required }),
    quantity: new FormControl('1', {
      nonNullable: true,
      validators: Validators.required,
    }),
    reason: new FormControl('', { nonNullable: true, validators: Validators.required }),
    type: new FormControl<InventoryMovementType>('out', { nonNullable: true }),
  });

  readonly adminRejectForm = new FormGroup({
    reason: new FormControl('', { nonNullable: true, validators: Validators.required }),
    verificationId: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
  });

  readonly module = computed(() => MODULE_DEFINITIONS[this.moduleKey()]);
  readonly statusOptions = computed(() => STATUS_OPTIONS[this.moduleKey()] ?? []);
  readonly showSearchFilter = computed(() =>
    MODULES_WITH_SEARCH.has(this.moduleKey()),
  );
  readonly showStatusFilter = computed(() =>
    MODULES_WITH_STATUS.has(this.moduleKey()),
  );
  readonly showTypeFilter = computed(() =>
    MODULES_WITH_TYPE.has(this.moduleKey()),
  );
  readonly showDateFilters = computed(() =>
    MODULES_WITH_DATES.has(this.moduleKey()),
  );
  readonly showArchivedFilter = computed(() =>
    MODULES_WITH_ARCHIVED.has(this.moduleKey()),
  );
  readonly showAthleteFilter = computed(() =>
    MODULES_WITH_ATHLETE_FILTER.has(this.moduleKey()),
  );

  readonly currentRole = computed(() => this.auth.currentUser()?.role ?? null);
  readonly professionalIsPending = computed(() => {
    const user = this.auth.currentUser();
    return user?.role === 'professional' && user.verificationStatus !== 'approved';
  });

  readonly links = computed(() => this.records() as LinkRecord[]);
  readonly protocols = computed(() => this.records() as ProtocolRecord[]);
  readonly trackingRecords = computed(() => this.records() as TrackingRecord[]);
  readonly checkIns = computed(() => this.records() as CheckInRecord[]);
  readonly exams = computed(() => this.records() as ExamRecord[]);
  readonly progressRecords = computed(() => this.records() as PhysicalProgressRecord[]);
  readonly historyItems = computed(() => this.records() as HistoryItem[]);
  readonly inventoryItems = computed(() => this.records() as InventoryItem[]);
  readonly notifications = computed(() => this.records() as NotificationRecord[]);

  readonly trackingTypeOptions = TRACKING_TYPE_OPTIONS;
  readonly inventoryUnitOptions = INVENTORY_UNIT_OPTIONS;
  readonly inventoryMovementOptions = INVENTORY_MOVEMENT_OPTIONS;
  readonly trackingStatusOptions = TRACKING_STATUS_OPTIONS;
readonly activeAthleteLinks = computed(() =>
  this.professionalAthleteLinks().filter(
    (link) => link.status === 'active',
  ),
);
  constructor() {
  this.route.queryParamMap
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe((params) => {
      const athleteId =
        params.get('athleteId') ?? '';

      if (athleteId) {
        this.applyAthleteSelection(athleteId);
      }
    });

  this.route.data
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe((data) => {
      const module =
        this.toModuleKey(data['module']);

      this.moduleKey.set(module);
      this.clearMessages();
      this.records.set([]);
      this.protocolVersions.set([]);
      this.selectedProtocolId.set('');

      this.loadProfessionalAthletes();
      this.load();
    });
}

  load(): void {
    const module = this.moduleKey();
    this.loading.set(true);
    this.error.set('');

    if (module === 'admin') {
      this.loadAdmin();
      return;
    }

    const query = this.queryFor(module);
    const request = this.requestFor(module, query);

    request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (response) => this.applyPage(response),
      error: (error: unknown) => {
        this.records.set([]);
        this.meta.set(null);
        this.error.set(this.resolveErrorMessage(error));
      },
    });
  }

  applyFilters(): void {
    this.clearMessages();
    this.load();
  }

  resetFilters(): void {
    this.filtersForm.reset({
      archived: '',
      athleteId: '',
      dateFrom: '',
      dateTo: '',
      read: '',
      search: '',
      status: '',
      type: '',
    });
    this.applyFilters();
  }

  submitLink(): void {
    if (this.linkForm.controls.athleteEmail.invalid) {
      this.actionError.set('Informe um e-mail de atleta válido.');
      return;
    }

    this.runAction(
      this.operations.createLink(this.linkForm.controls.athleteEmail.value.trim()),
      'Solicitação de vínculo criada.',
      () => this.linkForm.controls.athleteEmail.setValue(''),
    );
  }

  acceptLink(link: LinkRecord): void {
    this.runAction(this.operations.acceptLink(link.id), 'Vínculo aceito.');
  }

  rejectLink(link: LinkRecord): void {
    this.runAction(
      this.operations.rejectLink(link.id, this.linkForm.controls.reason.value),
      'Vínculo rejeitado.',
      () => this.linkForm.controls.reason.setValue(''),
    );
  }

  endLink(link: LinkRecord): void {
    this.runAction(
      this.operations.endLink(link.id, this.linkForm.controls.reason.value),
      'Vínculo encerrado.',
      () => this.linkForm.controls.reason.setValue(''),
    );
  }

  submitProtocol(): void {
    if (this.protocolForm.invalid) {
      this.actionError.set('Informe atleta, título e data inicial.');
      return;
    }

    const value = this.protocolForm.getRawValue();
    this.runAction(
      this.operations.createProtocol({
        athleteId: value.athleteId.trim(),
        continuous: value.continuous,
        endDate: value.continuous ? null : this.toIsoOrNull(value.endDate),
        objective: this.nullableText(value.objective),
        startDate: this.toIso(value.startDate),
        title: value.title.trim(),
        items: [],
      }),
      'Protocolo criado em rascunho.',
      () => {
        this.protocolForm.patchValue({
          athleteId: '',
          endDate: '',
          objective: '',
          title: '',
        });
      },
    );
  }

  updateProtocolStatus(protocol: ProtocolRecord, status: ProtocolStatus): void {
    this.runAction(
      this.operations.updateProtocolStatus(
        protocol.id,
        status,
        this.protocolActionForm.controls.reason.value,
      ),
      `Protocolo atualizado para ${this.statusLabel(status)}.`,
      () => this.protocolActionForm.controls.reason.setValue(''),
    );
  }

  loadProtocolVersions(protocol: ProtocolRecord): void {
    this.actionLoading.set(true);
    this.actionError.set('');
    this.successMessage.set('');

    this.operations
      .listProtocolVersions(protocol.id)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.selectedProtocolId.set(protocol.id);
          this.protocolVersions.set(response.data);
          this.protocolVersionForm.controls.protocolId.setValue(protocol.id);
          this.successMessage.set('Versões carregadas.');
        },
        error: (error: unknown) => this.actionError.set(this.resolveErrorMessage(error)),
      });
  }

  submitProtocolVersion(): void {
    if (this.protocolVersionForm.controls.protocolId.invalid) {
      this.actionError.set('Informe o ID do protocolo para criar a versão.');
      return;
    }

    const value = this.protocolVersionForm.getRawValue();
    const payload = {
      changeReason: this.nullableText(value.changeReason),
      continuous: value.continuous,
      endDate: value.continuous ? null : this.toIsoOrNull(value.endDate),
      startDate: this.toIsoOrUndefined(value.startDate),
      items: [] as [],
    };

    this.runAction(
      this.operations.createProtocolVersion(value.protocolId.trim(), payload),
      'Nova versão criada.',
    );
  }

  submitTracking(): void {
    if (
  this.currentRole() === 'professional' &&
  !this.trackingForm.controls.athleteId.value.trim()
) {
  this.actionError.set(
    'Selecione o atleta do tracking.',
  );
  return;
}
    if (this.trackingForm.invalid) {
      this.actionError.set('Informe título e data agendada.');
      return;
    }

    const value = this.trackingForm.getRawValue();
    this.runAction(
      this.operations.createTrackingRecord({
        athleteId: this.undefinedText(value.athleteId),
        notes: this.nullableText(value.notes),
        protocolId: this.nullableText(value.protocolId),
        scheduledFor: this.toIso(value.scheduledFor),
        title: value.title.trim(),
        type: value.type,
      }),
      'Registro de tracking criado.',
      () => this.trackingForm.patchValue({ athleteId: '', notes: '', protocolId: '', title: '' }),
    );
  }

  transitionTracking(record?: TrackingRecord): void {
    if (record) {
      this.trackingActionForm.controls.id.setValue(record.id);
    }
    if (this.trackingActionForm.controls.id.invalid) {
      this.actionError.set('Informe o ID do tracking.');
      return;
    }

    const value = this.trackingActionForm.getRawValue();
    const payload: {
      status: TrackingRecordStatus;
      completedAt?: string;
      notes?: string | null;
      reason?: string;
    } = { status: value.status };

    if (value.status === 'completed') {
      payload.completedAt = this.toIso(value.completedAt);
      payload.notes = this.nullableText(value.notes);
    } else {
      const reason = value.reason.trim();
      if (!reason) {
        this.actionError.set('Informe o motivo para perdido/cancelado.');
        return;
      }
      payload.reason = reason;
    }

    this.runAction(
      this.operations.transitionTrackingRecord(value.id.trim(), payload),
      'Status do tracking atualizado.',
    );
  }

  submitCheckIn(): void {
    if (this.checkInForm.invalid) {
      this.actionError.set('Informe semana de referência e responses.');
      return;
    }

    const value = this.checkInForm.getRawValue();
    const responses = this.parseJsonObject(value.responsesJson);
    if (!responses) return;

    this.runAction(
      this.operations.createCheckIn({
        professionalId: this.undefinedText(value.professionalId),
        protocolId: this.nullableText(value.protocolId),
        referenceWeek: this.toIso(value.referenceWeek),
        responses,
      }),
      'Check-in criado.',
    );
  }

  submitCheckInRecord(checkIn: CheckInRecord): void {
    this.runAction(this.operations.submitCheckIn(checkIn.id), 'Check-in enviado.');
  }

  reviewCheckIn(record?: CheckInRecord): void {
    if (record) {
      this.checkInReviewForm.controls.id.setValue(record.id);
    }
    if (this.checkInReviewForm.invalid) {
      this.actionError.set('Informe o ID e o comentário de revisão.');
      return;
    }

    const value = this.checkInReviewForm.getRawValue();
    this.runAction(
      this.operations.reviewCheckIn(value.id.trim(), value.reviewComment.trim()),
      'Check-in revisado.',
      () => this.checkInReviewForm.patchValue({ id: '', reviewComment: '' }),
    );
  }

  selectExamDocument(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;

    this.examDocumentError.set('');
    this.examDocument.set(null);

    if (!file) return;
    if (!this.isPdf(file)) {
      this.examDocumentError.set('Envie um PDF válido.');
      if (input) input.value = '';
      return;
    }

    this.examDocument.set(file);
  }

  clearExamDocument(input?: HTMLInputElement): void {
    this.examDocument.set(null);
    this.examDocumentError.set('');
    if (input) input.value = '';
  }

  submitExam(): void {
    if (
  this.currentRole() === 'professional' &&
  !this.examForm.controls.athleteId.value.trim()
) {
  this.actionError.set(
    'Selecione o atleta do exame.',
  );
  return;
}
    if (this.examForm.invalid) {
      this.actionError.set('Informe título e data do exame.');
      return;
      
    }

    const value = this.examForm.getRawValue();
    const results = this.parseExamResults(value.resultsJson);
    if (!results) return;

    this.runAction(
      this.operations.createExam({
        athleteId: this.undefinedText(value.athleteId),
        document: this.examDocument(),
        examDate: this.toIso(value.examDate),
        laboratory: this.nullableText(value.laboratory),
        notes: this.nullableText(value.notes),
        results,
        title: value.title.trim(),
      }),
      'Exame registrado.',
      () => {
        this.examForm.patchValue({
          athleteId: '',
          laboratory: '',
          notes: '',
          resultsJson: '[]',
          title: '',
        });
        this.examDocument.set(null);
      },
    );
  }

  archiveExam(exam: ExamRecord): void {
    this.runAction(this.operations.archiveExam(exam.id), 'Exame arquivado.');
  }

  submitProgress(): void {
    if (
  this.currentRole() === 'professional' &&
  !this.progressForm.controls.athleteId.value.trim()
) {
  this.actionError.set(
    'Selecione o atleta da evolução física.',
  );
  return;
}
    if (this.progressForm.invalid) {
      this.actionError.set('Informe a data de referência.');
      return;
    }

    const value = this.progressForm.getRawValue();
    const payload = {
      athleteId: this.undefinedText(value.athleteId),
      bodyFatPercent: this.nullableNumber(value.bodyFatPercent),
      measurements: {
        armCm: this.nullableNumber(value.armCm),
        calfCm: this.nullableNumber(value.calfCm),
        chestCm: this.nullableNumber(value.chestCm),
        thighCm: this.nullableNumber(value.thighCm),
        waistCm: this.nullableNumber(value.waistCm),
      },
      notes: this.nullableText(value.notes),
      referenceDate: this.toIso(value.referenceDate),
      weightKg: this.nullableNumber(value.weightKg),
    };

    if (
      payload.weightKg === null &&
      payload.bodyFatPercent === null &&
      !payload.notes &&
      Object.values(payload.measurements).every((item) => item === null)
    ) {
      this.actionError.set('Informe ao menos uma medida, peso, gordura ou observação.');
      return;
    }

    this.runAction(
      this.operations.createPhysicalProgress(payload),
      'Evolução física registrada.',
    );
  }

  archiveProgress(record: PhysicalProgressRecord): void {
    this.runAction(
      this.operations.archivePhysicalProgress(record.id),
      'Registro de evolução arquivado.',
    );
  }

  submitInventoryItem(): void {
    if (this.inventoryForm.invalid) {
      this.actionError.set('Informe nome e quantidade.');
      return;
    }

    const value = this.inventoryForm.getRawValue();
    this.runAction(
      this.operations.createInventoryItem({
        expirationDate: this.toIsoOrNull(value.expirationDate),
        lowStockThreshold: this.nullableNumber(value.lowStockThreshold),
        name: value.name.trim(),
        quantity: this.requiredNumber(value.quantity),
        substanceId: this.nullableText(value.substanceId),
        unit: value.unit,
      }),
      'Item de inventário criado.',
      () => this.inventoryForm.patchValue({ name: '', quantity: '0' }),
    );
  }

  submitInventoryMovement(item?: InventoryItem): void {
    if (item) {
      this.inventoryMovementForm.controls.itemId.setValue(item.id);
    }
    if (this.inventoryMovementForm.invalid) {
      this.actionError.set('Informe item, quantidade e motivo.');
      return;
    }

    const value = this.inventoryMovementForm.getRawValue();
    this.runAction(
      this.operations.createInventoryMovement(value.itemId.trim(), {
        quantity: this.requiredNumber(value.quantity),
        reason: value.reason.trim(),
        type: value.type,
      }),
      'Movimentação registrada.',
      () => this.inventoryMovementForm.patchValue({ itemId: '', quantity: '1', reason: '' }),
    );
  }

  archiveInventoryItem(item: InventoryItem): void {
    this.runAction(
      this.operations.archiveInventoryItem(item.id),
      'Item arquivado.',
    );
  }

  markNotificationAsRead(notification: NotificationRecord): void {
    this.runAction(
      this.operations.markNotificationAsRead(notification.id),
      'Notificação marcada como lida.',
    );
  }

  markAllNotificationsAsRead(): void {
    this.runAction(
      this.operations.markAllNotificationsAsRead(),
      'Todas as notificações foram marcadas como lidas.',
    );
  }

  archiveNotification(notification: NotificationRecord): void {
    this.runAction(
      this.operations.archiveNotification(notification.id),
      'Notificação arquivada.',
    );
  }

  toggleUserBlocked(user: UserRecord): void {
    this.runAction(
      this.operations.setUserBlocked(user.id, user.active),
      user.active ? 'Usuário bloqueado.' : 'Usuário desbloqueado.',
    );
  }

  approveVerification(verification: AdminProfessionalVerification): void {
    this.runAction(
      this.operations.approveProfessionalVerification(verification.id),
      'Profissional aprovado.',
    );
  }

  selectVerificationForRejection(verification: AdminProfessionalVerification): void {
    this.adminRejectForm.controls.verificationId.setValue(verification.id);
  }

  rejectVerification(): void {
    if (this.adminRejectForm.invalid) {
      this.actionError.set('Informe o ID da verificação e o motivo.');
      return;
    }

    const value = this.adminRejectForm.getRawValue();
    this.runAction(
      this.operations.rejectProfessionalVerification(
        value.verificationId.trim(),
        value.reason.trim(),
      ),
      'Profissional rejeitado.',
      () => this.adminRejectForm.reset({ reason: '', verificationId: '' }),
    );
  }

  canCreateLink(user: AuthUser | null = this.auth.currentUser()): boolean {
    return user?.role === 'professional' && user.verificationStatus === 'approved';
  }

  canCreateProtocol(): boolean {
    const user = this.auth.currentUser();
    return user?.role === 'professional' && user.verificationStatus === 'approved';
  }

  canCreateAthleteRecord(): boolean {
    const role = this.currentRole();
    return role === 'athlete' || role === 'professional';
  }

  canCreateAthleteOnly(): boolean {
    return this.currentRole() === 'athlete';
  }

  canAdmin(): boolean {
    return this.currentRole() === 'admin';
  }

  formatDate(value: string | null): string {
    return this.formatWith(DATE_FORMATTER, value);
  }

  formatDateTime(value: string | null): string {
    return this.formatWith(DATE_TIME_FORMATTER, value);
  }

  statusLabel(status: string | null): string {
    if (!status) return 'Sem status';
    const option = Object.values(STATUS_OPTIONS)
      .flat()
      .find((item) => item.value === status);
    return option?.label ?? this.codeLabel(status);
  }

  codeLabel(value: string | null): string {
    if (!value) return 'Não informado';

    const normalized = value
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .trim()
      .toLowerCase();

    if (!normalized) return 'Não informado';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  shortId(value: string | null): string {
    if (!value) return 'Não informado';
    return value.length <= 12 ? value : `${value.slice(0, 7)}...${value.slice(-4)}`;
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

  jsonSummary(value: JsonObject): string {
    const keys = Object.keys(value);
    if (!keys.length) return 'Sem respostas';
    return keys.slice(0, 4).join(', ');
  }

  resultSummary(results: ExamResult[]): string {
    if (!results.length) return 'Sem resultados estruturados';
    return results
      .slice(0, 3)
      .map((result) => `${result.marker}: ${result.value}${result.unit ? ` ${result.unit}` : ''}`)
      .join(' | ');
  }

  protocolStatusTargets(protocol: ProtocolRecord): SelectOption<ProtocolStatus>[] {
    if (protocol.status === 'draft') {
      return [
        { value: 'active', label: 'Ativar' },
        { value: 'cancelled', label: 'Cancelar' },
      ];
    }
    if (protocol.status === 'active') {
      return [
        { value: 'paused', label: 'Pausar' },
        { value: 'closed', label: 'Fechar' },
      ];
    }
    if (protocol.status === 'paused') {
      return [
        { value: 'active', label: 'Reativar' },
        { value: 'closed', label: 'Fechar' },
      ];
    }
    return [];
  }

  trackById(_index: number, item: { id: string }): string {
    return item.id;
  }
athleteLabel(link: LinkRecord): string {
  return (
    link.athlete?.name ||
    `Atleta ${this.shortId(link.athleteId)}`
  );
}

athleteEmail(link: LinkRecord): string {
  return link.athlete?.email || '';
}

selectAthlete(link: LinkRecord): void {
  this.applyAthleteSelection(link.athleteId);

  this.successMessage.set(
    `${this.athleteLabel(link)} selecionado.`,
  );

  if (this.showAthleteFilter()) {
    this.load();
  }
}

viewAthleteProtocols(link: LinkRecord): void {
  this.router.navigate(
    ['/app/protocols'],
    {
      queryParams: {
        athleteId: link.athleteId,
      },
    },
  );
}

viewAthleteTracking(link: LinkRecord): void {
  this.router.navigate(
    ['/app/tracking'],
    {
      queryParams: {
        athleteId: link.athleteId,
      },
    },
  );
}

viewAthleteCheckIns(link: LinkRecord): void {
  this.router.navigate(
    ['/app/check-ins'],
    {
      queryParams: {
        athleteId: link.athleteId,
      },
    },
  );
}

athleteNameById(
  athleteId: string | null,
): string {
  if (!athleteId) {
    return 'Não informado';
  }

  const link =
    this.activeAthleteLinks().find(
      (item) =>
        item.athleteId === athleteId,
    );

  return link
    ? this.athleteLabel(link)
    : `Atleta ${this.shortId(athleteId)}`;
}

private applyAthleteSelection(
  athleteId: string,
): void {
  this.filtersForm.controls.athleteId.setValue(
    athleteId,
  );

  this.protocolForm.controls.athleteId.setValue(
    athleteId,
  );

  this.trackingForm.controls.athleteId.setValue(
    athleteId,
  );

  this.examForm.controls.athleteId.setValue(
    athleteId,
  );

  this.progressForm.controls.athleteId.setValue(
    athleteId,
  );
}

private loadProfessionalAthletes(): void {
  const user = this.auth.currentUser();

  if (
    user?.role !== 'professional' ||
    user.verificationStatus !== 'approved'
  ) {
    this.professionalAthleteLinks.set([]);
    return;
  }

  this.operations
    .listLinks({
      status: 'active',
      page: 1,
      limit: 100,
    })
    .pipe(
      takeUntilDestroyed(this.destroyRef),
    )
    .subscribe({
      next: (response) => {
        this.professionalAthleteLinks.set(
          response.data,
        );
      },
      error: () => {
        this.professionalAthleteLinks.set([]);
      },
    });
}
  private loadAdmin(): void {
    const query = this.queryFor('admin');
    const adminQuery: OperationQuery = {
      limit: 20,
      role: query['status'],
      search: query['search'],
    };
    const verificationQuery: OperationQuery = {
      limit: 20,
      search: query['search'],
      status: query['type'] || 'pending',
    };

    forkJoin({
      auditLogs: this.operations.listAuditLogs({ limit: 20 }),
      users: this.operations.listUsers(adminQuery),
      verifications: this.operations.listProfessionalVerifications(verificationQuery),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ auditLogs, users, verifications }) => {
          this.records.set([]);
          this.adminUsers.set(users.data);
          this.adminVerifications.set(verifications.data);
          this.adminAuditLogs.set(auditLogs.data);
          this.meta.set(users.meta);
        },
        error: (error: unknown) => {
          this.adminUsers.set([]);
          this.adminVerifications.set([]);
          this.adminAuditLogs.set([]);
          this.meta.set(null);
          this.error.set(this.resolveErrorMessage(error));
        },
      });
  }

  private requestFor(
    module: OperationModuleKey,
    query: OperationQuery,
  ): Observable<PaginatedResponse<OperationRecord>> {
    switch (module) {
      case 'check-ins':
        return this.operations.listCheckIns(query);
      case 'exams':
        return this.operations.listExams(query);
      case 'inventory':
        return this.operations.listInventoryItems(query);
      case 'links':
        return this.operations.listLinks(query);
      case 'notifications':
        return this.operations.listNotifications(query);
      case 'progress':
        return this.operations.listPhysicalProgress(query);
      case 'protocols':
        return this.operations.listProtocols(query);
      case 'timeline':
        return this.operations.listHistory(query);
      case 'tracking':
        return this.operations.listTrackingRecords(query);
      case 'admin':
        throw new Error('Admin uses loadAdmin.');
    }
  }

  private applyPage<T extends OperationRecord>(response: PaginatedResponse<T>): void {
    this.records.set(response.data);
    this.meta.set(response.meta);
  }

  private runAction<T>(
    request: Observable<T>,
    successMessage: string,
    afterSuccess?: () => void,
  ): void {
    this.actionLoading.set(true);
    this.actionError.set('');
    this.successMessage.set('');

    request.pipe(finalize(() => this.actionLoading.set(false))).subscribe({
      next: () => {
        afterSuccess?.();
        this.successMessage.set(successMessage);
        this.load();
      },
      error: (error: unknown) => this.actionError.set(this.resolveErrorMessage(error)),
    });
  }

  private queryFor(module: OperationModuleKey): OperationQuery {
    const value = this.filtersForm.getRawValue();
    const query: OperationQuery = { limit: 20 };

    if (MODULES_WITH_SEARCH.has(module)) query['search'] = value.search.trim();
    if (MODULES_WITH_STATUS.has(module)) query['status'] = value.status;
    if (MODULES_WITH_TYPE.has(module)) query['type'] = value.type;
    if (MODULES_WITH_ATHLETE_FILTER.has(module)) {
      query['athleteId'] = value.athleteId.trim();
    }
    if (MODULES_WITH_DATES.has(module)) {
      query['dateFrom'] = value.dateFrom;
      query['dateTo'] = value.dateTo;
    }
    if (MODULES_WITH_ARCHIVED.has(module)) {
      query['archived'] = value.archived;
    }
    if (module === 'notifications') {
      query['read'] = value.read;
    }
    if (module === 'admin') {
      query['search'] = value.search.trim();
      query['status'] = value.status;
      query['type'] = value.type;
    }

    return query;
  }

  private parseJsonObject(value: string): JsonObject | null {
    try {
      const parsed: unknown = JSON.parse(value);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        this.actionError.set('responses deve ser um objeto JSON simples.');
        return null;
      }
      return parsed as JsonObject;
    } catch {
      this.actionError.set('responses deve conter JSON válido.');
      return null;
    }
  }

  private parseExamResults(value: string): ExamResult[] | null {
    try {
      const parsed: unknown = JSON.parse(value || '[]');
      if (!Array.isArray(parsed)) {
        this.actionError.set('results deve ser um array JSON.');
        return null;
      }

      const results: ExamResult[] = [];
      for (const entry of parsed) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
          this.actionError.set('Cada resultado precisa ser um objeto.');
          return null;
        }
        const item = entry as Record<string, unknown>;
        if (typeof item['marker'] !== 'string' || typeof item['value'] !== 'string') {
          this.actionError.set('Cada resultado precisa de marker e value.');
          return null;
        }
        results.push({
          marker: item['marker'],
          referenceRange:
            typeof item['referenceRange'] === 'string' ? item['referenceRange'] : null,
          unit: typeof item['unit'] === 'string' ? item['unit'] : null,
          value: item['value'],
        });
      }
      return results;
    } catch {
      this.actionError.set('results deve conter JSON válido.');
      return null;
    }
  }

  private formatWith(formatter: Intl.DateTimeFormat, value: string | null): string {
    if (!value) return 'Não informado';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Data indisponível' : formatter.format(date);
  }

  private toModuleKey(value: unknown): OperationModuleKey {
    return typeof value === 'string' && value in MODULE_DEFINITIONS
      ? (value as OperationModuleKey)
      : 'links';
  }

  private toIso(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  }

  private toIsoOrNull(value: string): string | null {
    const cleanValue = value.trim();
    return cleanValue ? this.toIso(cleanValue) : null;
  }

  private toIsoOrUndefined(value: string): string | undefined {
    const cleanValue = value.trim();
    return cleanValue ? this.toIso(cleanValue) : undefined;
  }

  private nullableText(value: string): string | null {
    const cleanValue = value.trim();
    return cleanValue ? cleanValue : null;
  }

  private undefinedText(value: string): string | undefined {
    return this.nullableText(value) ?? undefined;
  }

  private nullableNumber(value: string): number | null {
    const cleanValue = value.trim().replace(',', '.');
    if (!cleanValue) return null;
    const parsed = Number(cleanValue);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private requiredNumber(value: string): number {
    return this.nullableNumber(value) ?? 0;
  }

  private todayInputValue(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private dateTimeInputValue(): string {
    return new Date().toISOString().slice(0, 16);
  }

  private isPdf(file: File): boolean {
    return file.type === 'application/pdf' && file.name.toLowerCase().endsWith('.pdf');
  }

  private clearMessages(): void {
    this.error.set('');
    this.actionError.set('');
    this.successMessage.set('');
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const response = error.error as Partial<ApiErrorResponse> | null;
      const message = response?.error?.message;
      if (typeof message === 'string' && message.trim()) return message;
    }

    return 'Não foi possível concluir a operação agora. Tente novamente.';
  }
}
