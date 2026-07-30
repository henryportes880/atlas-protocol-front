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
  FormArray,
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
  ProtocolItem,
  ProtocolRecord,
  ProtocolStatus,
  ProtocolVersionRecord,
  TrackingRecord,
  TrackingRecordStatus,
  TrackingRecordType,
  UserRecord,
  ProtocolFrequencyType,
  SubstanceCategory,
  SubstanceRecord,
} from '../../core/models/operations.model';
import { AuthService } from '../../core/services/auth.service';
import {
  OperationsService,
  ProtocolItemPayload,
} from '../../core/services/operations.service';
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

type ProtocolItemForm = FormGroup<{
  substanceId: FormControl<string>;
  instructions: FormControl<string>;
  frequencyType: FormControl<ProtocolFrequencyType>;
  weekDays: FormControl<number[]>;
  time: FormControl<string>;
  startDate: FormControl<string>;
  endDate: FormControl<string>;
  active: FormControl<boolean>;
}>;

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

const SUBSTANCE_CATEGORY_OPTIONS: SelectOption<SubstanceCategory>[] = [
  { value: 'hormone', label: 'Hormônio' },
  { value: 'medication', label: 'Medicamento' },
  { value: 'other', label: 'Outro' },
  { value: 'peptide', label: 'Peptídeo' },
  { value: 'supplement', label: 'Suplemento' },
  { value: 'vitamin', label: 'Vitamina' },
];

const INVENTORY_MOVEMENT_OPTIONS: SelectOption<InventoryMovementType>[] = [
  { value: 'in', label: 'Entrada' },
  { value: 'out', label: 'Saída' },
  { value: 'adjustment', label: 'Ajuste' },
];

const WEEK_DAY_OPTIONS = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 7, label: 'Dom' },
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
  readonly substanceCreationLoading = signal(false);
  readonly substanceCreationOpen = signal(false);
  readonly substanceCreationItemIndex = signal<number | null>(null);
  readonly substanceCreationTarget = signal<'protocol' | 'version'>('protocol');
  readonly documentLoadingId = signal('');
  readonly error = signal('');
  readonly actionError = signal('');
  readonly successMessage = signal('');
  readonly records = signal<OperationRecord[]>([]);
  readonly professionalAthleteLinks =
  signal<LinkRecord[]>([]);
  readonly protocolFrequencyOptions: SelectOption<ProtocolFrequencyType>[] = [
  {
    value: 'daily',
    label: 'Diária',
  },
  {
    value: 'weekly',
    label: 'Semanal',
  },
  {
    value: 'custom',
    label: 'Personalizada',
  },
];
  readonly substances = signal<SubstanceRecord[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly protocolVersions = signal<ProtocolVersionRecord[]>([]);
  readonly selectedProtocolId = signal('');
  readonly selectedProtocolVersion = signal<ProtocolVersionRecord | null>(null);
  readonly editingProtocolId = signal('');
  readonly availableProtocols = signal<ProtocolRecord[]>([]);
  readonly selectedTrackingTitle = signal('');
  readonly selectedCheckInLabel = signal('');
  readonly selectedInventoryItemName = signal('');
  readonly selectedVerificationLabel = signal('');
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
    athleteId: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    continuous: new FormControl(true, { nonNullable: true }),
    endDate: new FormControl('', { nonNullable: true }),
    objective: new FormControl('', { nonNullable: true }),
    startDate: new FormControl(this.todayInputValue(), {
      nonNullable: true,
      validators: Validators.required,
    }),
    title: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    items: new FormArray<ProtocolItemForm>([this.createProtocolItemForm()]),
  });

  readonly newSubstanceForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(120),
      ],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: Validators.maxLength(1000),
    }),
    category: new FormControl<SubstanceCategory | ''>('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    defaultUnit: new FormControl<InventoryUnit | ''>('', {
      nonNullable: true,
    }),
  });

  readonly protocolActionForm = new FormGroup({
    reason: new FormControl('', { nonNullable: true }),
  });

  readonly protocolVersionForm = new FormGroup({
    changeReason: new FormControl('', { nonNullable: true }),
    continuous: new FormControl<'keep' | 'true' | 'false'>('keep', {
      nonNullable: true,
    }),
    endDate: new FormControl('', { nonNullable: true }),
    includeItems: new FormControl(false, { nonNullable: true }),
    protocolId: new FormControl('', { nonNullable: true, validators: Validators.required }),
    startDate: new FormControl('', { nonNullable: true }),
    items: new FormArray<ProtocolItemForm>([]),
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
  readonly substanceCategoryOptions = SUBSTANCE_CATEGORY_OPTIONS;
  readonly weekDayOptions = WEEK_DAY_OPTIONS;
  readonly inventoryMovementOptions = INVENTORY_MOVEMENT_OPTIONS;
  readonly trackingStatusOptions = TRACKING_STATUS_OPTIONS;
readonly activeAthleteLinks = computed(() =>
  this.professionalAthleteLinks().filter(
    (link) => link.status === 'active',
  ),
);
  readonly activeProfessionalLinks = computed(() =>
    this.professionalAthleteLinks().filter(
      (link) => link.status === 'active' && Boolean(link.professional),
    ),
  );
  readonly protocolItems = this.protocolForm.controls.items;
  readonly protocolVersionItems = this.protocolVersionForm.controls.items;
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

      this.loadAccessibleLinks();

      if (module === 'protocols' || module === 'inventory') {
        this.loadSubstances();
      }
      if (module === 'tracking' || module === 'check-ins') {
        this.loadAvailableProtocols();
      }

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
    if (this.protocolForm.invalid || !this.validateProtocolItems(this.protocolItems)) {
      this.actionError.set(
        'Informe atleta, título, data inicial e ao menos um item válido.',
      );
      this.protocolForm.markAllAsTouched();
      return;
    }

    const value = this.protocolForm.getRawValue();
    const commonPayload = {
      continuous: value.continuous,
      endDate: value.continuous ? null : this.toIsoOrNull(value.endDate),
      objective: this.nullableText(value.objective),
      startDate: this.toIso(value.startDate),
      title: value.title.trim(),
      items: this.protocolItemsPayload(this.protocolItems),
    };
    const editingId = this.editingProtocolId();

    this.runAction(
      editingId
        ? this.operations.updateProtocol(editingId, commonPayload)
        : this.operations.createProtocol({
            athleteId: value.athleteId.trim(),
            ...commonPayload,
          }),
      editingId ? 'Rascunho atualizado.' : 'Protocolo criado em rascunho.',
      () => this.resetProtocolForm(),
    );
  }

  addProtocolItem(target: 'protocol' | 'version' = 'protocol'): void {
    this.protocolItemArray(target).push(this.createProtocolItemForm());
    if (target === 'version') {
      this.protocolVersionForm.controls.includeItems.setValue(true);
    }
  }

  removeProtocolItem(
    index: number,
    target: 'protocol' | 'version' = 'protocol',
  ): void {
    const items = this.protocolItemArray(target);
    if (items.length === 1) {
      this.actionError.set('O protocolo precisa manter ao menos um item.');
      return;
    }
    items.removeAt(index);
    if (target === 'version') {
      this.protocolVersionForm.controls.includeItems.setValue(true);
    }
  }

  updateProtocolItemFrequency(
    index: number,
    target: 'protocol' | 'version' = 'protocol',
  ): void {
    const item = this.protocolItemArray(target).at(index);
    if (item.controls.frequencyType.value !== 'weekly') {
      item.controls.weekDays.setValue([]);
    }
  }

  toggleProtocolWeekDay(
    index: number,
    day: number,
    checked: boolean,
    target: 'protocol' | 'version' = 'protocol',
  ): void {
    const control = this.protocolItemArray(target).at(index).controls.weekDays;
    const nextDays = checked
      ? [...new Set([...control.value, day])].sort((left, right) => left - right)
      : control.value.filter((value) => value !== day);
    control.setValue(nextDays);
    if (target === 'version') {
      this.protocolVersionForm.controls.includeItems.setValue(true);
    }
  }

  protocolWeekDaySelected(
    index: number,
    day: number,
    target: 'protocol' | 'version' = 'protocol',
  ): boolean {
    return this.protocolItemArray(target).at(index).controls.weekDays.value.includes(day);
  }

  toggleSubstanceCreation(
    itemIndex = 0,
    target: 'protocol' | 'version' = 'protocol',
  ): void {
    if (this.substanceCreationLoading()) return;

    if (
      this.substanceCreationOpen() &&
      this.substanceCreationItemIndex() === itemIndex &&
      this.substanceCreationTarget() === target
    ) {
      this.resetNewSubstanceForm();
      this.substanceCreationOpen.set(false);
      this.substanceCreationItemIndex.set(null);
      return;
    }

    this.actionError.set('');
    this.successMessage.set('');
    this.substanceCreationItemIndex.set(itemIndex);
    this.substanceCreationTarget.set(target);
    this.substanceCreationOpen.set(true);
  }

  closeSubstanceCreation(): void {
    if (this.substanceCreationLoading()) return;
    this.resetNewSubstanceForm();
    this.substanceCreationOpen.set(false);
    this.substanceCreationItemIndex.set(null);
    this.substanceCreationTarget.set('protocol');
  }

  submitNewSubstance(): void {
    if (this.newSubstanceForm.invalid) {
      this.actionError.set(
        'Informe nome e categoria válidos para o novo item.',
      );
      this.newSubstanceForm.markAllAsTouched();
      return;
    }

    const value = this.newSubstanceForm.getRawValue();
    if (!value.category) return;

    this.substanceCreationLoading.set(true);
    this.actionError.set('');
    this.successMessage.set('');

    this.operations
      .createSubstance({
        name: value.name.trim(),
        description: this.nullableText(value.description),
        category: value.category,
        defaultUnit: value.defaultUnit || null,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.substanceCreationLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          const substance = response.data.substance;
          this.substances.update((items) =>
            [...items.filter((item) => item.id !== substance.id), substance]
              .sort((left, right) =>
                left.name.localeCompare(right.name, 'pt-BR', {
                  sensitivity: 'base',
                }),
              ),
          );
          const itemIndex = this.substanceCreationItemIndex();
          if (itemIndex !== null) {
            this.protocolItemArray(this.substanceCreationTarget())
              .at(itemIndex)
              ?.controls.substanceId.setValue(substance.id);
            if (this.substanceCreationTarget() === 'version') {
              this.protocolVersionForm.controls.includeItems.setValue(true);
            }
          }
          this.resetNewSubstanceForm();
          this.substanceCreationOpen.set(false);
          this.substanceCreationItemIndex.set(null);
          this.successMessage.set(
            itemIndex === null
              ? 'Item criado na biblioteca.'
              : 'Item criado e selecionado no protocolo.',
          );
        },
        error: (error: unknown) => {
          this.actionError.set(this.resolveErrorMessage(error));
        },
      });
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
          this.selectedProtocolVersion.set(
            response.data.find((version) => version.version === protocol.currentVersion) ??
              null,
          );
          this.successMessage.set('Versões carregadas.');
        },
        error: (error: unknown) => this.actionError.set(this.resolveErrorMessage(error)),
      });
  }

  prepareProtocolVersion(protocol: ProtocolRecord): void {
    if (!this.canCreateProtocol() || !['active', 'paused'].includes(protocol.status)) {
      return;
    }

    this.actionLoading.set(true);
    this.clearMessages();
    this.operations
      .listProtocolVersions(protocol.id)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (response) => {
          const currentVersion =
            response.data.find(
              (version) => version.version === protocol.currentVersion,
            ) ?? null;
          if (!currentVersion) {
            this.actionError.set('A versão atual do protocolo não foi encontrada.');
            return;
          }

          this.selectedProtocolId.set(protocol.id);
          this.selectedProtocolVersion.set(currentVersion);
          this.protocolVersions.set(response.data);
          this.protocolVersionForm.patchValue({
            changeReason: '',
            continuous: 'keep',
            endDate: '',
            includeItems: false,
            protocolId: protocol.id,
            startDate: '',
          });
          this.replaceProtocolItems(this.protocolVersionItems, currentVersion.items);
          this.successMessage.set(`Protocolo "${protocol.title}" selecionado.`);
        },
        error: (error: unknown) =>
          this.actionError.set(this.resolveErrorMessage(error)),
      });
  }

  editProtocol(protocol: ProtocolRecord): void {
    if (!this.canCreateProtocol() || protocol.status !== 'draft') return;

    this.actionLoading.set(true);
    this.clearMessages();
    this.operations
      .listProtocolVersions(protocol.id)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (response) => {
          const currentVersion =
            response.data.find(
              (version) => version.version === protocol.currentVersion,
            ) ?? null;
          if (!currentVersion) {
            this.actionError.set('A versão atual do protocolo não foi encontrada.');
            return;
          }

          this.editingProtocolId.set(protocol.id);
          this.protocolForm.patchValue({
            athleteId: protocol.athleteId,
            continuous: protocol.continuous,
            endDate: this.dateInputValue(protocol.endDate),
            objective: protocol.objective ?? '',
            startDate: this.dateInputValue(protocol.startDate),
            title: protocol.title,
          });
          this.replaceProtocolItems(this.protocolItems, currentVersion.items);
          this.successMessage.set(`Editando o rascunho "${protocol.title}".`);
        },
        error: (error: unknown) =>
          this.actionError.set(this.resolveErrorMessage(error)),
      });
  }

  cancelProtocolEdit(): void {
    this.resetProtocolForm();
    this.clearMessages();
  }

  submitProtocolVersion(): void {
    if (this.protocolVersionForm.controls.protocolId.invalid) {
      this.actionError.set('Selecione um protocolo na tabela para criar a versão.');
      return;
    }

    const value = this.protocolVersionForm.getRawValue();
    const currentVersion = this.selectedProtocolVersion();
    if (!currentVersion) {
      this.actionError.set('Carregue a versão atual pela ação da tabela.');
      return;
    }
    const payload: {
      changeReason?: string | null;
      continuous?: boolean;
      endDate?: string | null;
      startDate?: string;
      items?: ProtocolItemPayload[];
    } = {};
    const startDate = this.toIsoOrUndefined(value.startDate);
    const endDate = this.toIsoOrUndefined(value.endDate);
    if (startDate) payload.startDate = startDate;
    if (endDate) payload.endDate = endDate;
    if (value.continuous !== 'keep') {
      payload.continuous = value.continuous === 'true';
      if (payload.continuous) payload.endDate = null;
    }
    if (
      payload.startDate !== undefined &&
      this.sameDateValue(payload.startDate, currentVersion.startDate)
    ) {
      delete payload.startDate;
    }
    if (
      payload.endDate !== undefined &&
      this.sameDateValue(payload.endDate, currentVersion.endDate)
    ) {
      delete payload.endDate;
    }
    if (
      payload.continuous !== undefined &&
      payload.continuous === currentVersion.continuous
    ) {
      delete payload.continuous;
    }

    if (value.includeItems) {
      if (!this.validateProtocolItems(this.protocolVersionItems)) {
        this.actionError.set('Revise os itens da nova versão.');
        return;
      }
      const items = this.protocolItemsPayload(this.protocolVersionItems);
      if (!this.protocolItemsChanged(items, currentVersion.items)) {
        this.actionError.set('Os itens informados não possuem alteração real.');
        return;
      }
      payload.items = items;
    }

    if (
      payload.startDate === undefined &&
      payload.endDate === undefined &&
      payload.continuous === undefined &&
      payload.items === undefined
    ) {
      this.actionError.set(
        'Informe uma alteração de data, continuidade ou itens para criar a versão.',
      );
      return;
    }

    const changeReason = this.nullableText(value.changeReason);
    if (changeReason) payload.changeReason = changeReason;

    this.runAction(
      this.operations.createProtocolVersion(value.protocolId.trim(), payload),
      'Nova versão criada.',
      () => this.resetProtocolVersionForm(),
    );
  }

  submitTracking(): void {
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

  selectTrackingRecord(record: TrackingRecord): void {
    this.trackingActionForm.controls.id.setValue(record.id);
    this.selectedTrackingTitle.set(record.title);
    this.actionError.set('');
    this.successMessage.set(`Tracking "${record.title}" selecionado.`);
  }

  transitionTracking(): void {
    if (this.trackingActionForm.controls.id.invalid) {
      this.actionError.set('Selecione um tracking na tabela.');
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
    if (
      this.activeProfessionalLinks().length > 1 &&
      !value.professionalId.trim()
    ) {
      this.actionError.set('Selecione o profissional responsável pelo check-in.');
      return;
    }
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

  selectCheckInForReview(record: CheckInRecord): void {
    this.checkInReviewForm.controls.id.setValue(record.id);
    this.selectedCheckInLabel.set(
      `${this.athleteNameById(record.athleteId)} · ${this.formatDate(record.referenceWeek)}`,
    );
    this.actionError.set('');
    this.successMessage.set('Check-in selecionado para revisão.');
  }

  reviewCheckIn(): void {
    if (this.checkInReviewForm.invalid) {
      this.actionError.set('Selecione um check-in e informe o comentário de revisão.');
      return;
    }

    const value = this.checkInReviewForm.getRawValue();
    this.runAction(
      this.operations.reviewCheckIn(value.id.trim(), value.reviewComment.trim()),
      'Check-in revisado.',
      () => {
        this.checkInReviewForm.patchValue({ id: '', reviewComment: '' });
        this.selectedCheckInLabel.set('');
      },
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

  viewExamDocument(exam: ExamRecord): void {
    if (!exam.document || this.documentLoadingId()) return;
    this.openPrivatePdf(
      exam.id,
      this.operations.downloadExamDocument(exam.id),
      exam.document.originalName,
    );
  }

  submitProgress(): void {
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

  selectInventoryItem(item: InventoryItem): void {
    this.inventoryMovementForm.controls.itemId.setValue(item.id);
    this.selectedInventoryItemName.set(item.name);
    this.actionError.set('');
    this.successMessage.set(`Item "${item.name}" selecionado para movimentação.`);
  }

  submitInventoryMovement(): void {
    if (this.inventoryMovementForm.invalid) {
      this.actionError.set('Selecione um item e informe quantidade e motivo.');
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
      () => {
        this.inventoryMovementForm.patchValue({ itemId: '', quantity: '1', reason: '' });
        this.selectedInventoryItemName.set('');
      },
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
    this.selectedVerificationLabel.set(
      verification.user?.name || this.shortId(verification.userId),
    );
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
      () => {
        this.adminRejectForm.reset({ reason: '', verificationId: '' });
        this.selectedVerificationLabel.set('');
      },
    );
  }

  viewProfessionalDocument(
    verification: AdminProfessionalVerification,
  ): void {
    if (!verification.verificationDocument || this.documentLoadingId()) return;
    this.openPrivatePdf(
      verification.id,
      this.operations.downloadProfessionalVerificationDocument(verification.id),
      verification.verificationDocument.originalName,
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
    const user = this.auth.currentUser();
    return (
      user?.role === 'athlete' ||
      (user?.role === 'professional' && user.verificationStatus === 'approved')
    );
  }

  canCreateAthleteOnly(): boolean {
    return this.currentRole() === 'athlete';
  }

  canAdmin(): boolean {
    return this.currentRole() === 'admin';
  }

  canReviewCheckIns(): boolean {
    const user = this.auth.currentUser();
    return user?.role === 'professional' && user.verificationStatus === 'approved';
  }

  canMutateProtocols(): boolean {
    return this.canCreateProtocol();
  }

  canMutateTracking(): boolean {
    return this.canCreateAthleteRecord();
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

professionalLabel(link: LinkRecord): string {
  return (
    link.professional?.name ||
    `Profissional ${this.shortId(link.professionalId)}`
  );
}

professionalEmail(link: LinkRecord): string {
  return link.professional?.email || '';
}

linkCounterpartLabel(link: LinkRecord): string {
  if (this.currentRole() === 'athlete') return this.professionalLabel(link);
  if (this.currentRole() === 'admin') {
    return `${this.professionalLabel(link)} ↔ ${this.athleteLabel(link)}`;
  }
  return this.athleteLabel(link);
}

linkCounterpartEmail(link: LinkRecord): string {
  if (this.currentRole() === 'athlete') return this.professionalEmail(link);
  if (this.currentRole() === 'admin') {
    return [this.professionalEmail(link), this.athleteEmail(link)]
      .filter(Boolean)
      .join(' · ');
  }
  return this.athleteEmail(link);
}

protocolsForAthlete(athleteId: string): ProtocolRecord[] {
  const resolvedAthleteId =
    athleteId ||
    (this.currentRole() === 'athlete' ? this.auth.currentUser()?.id ?? '' : '');
  if (!resolvedAthleteId) return [];
  return this.availableProtocols().filter(
    (protocol) => protocol.athleteId === resolvedAthleteId,
  );
}

checkInProtocols(): ProtocolRecord[] {
  const professionalId = this.checkInForm.controls.professionalId.value;
  return this.availableProtocols().filter(
    (protocol) =>
      protocol.status === 'active' &&
      (!professionalId || protocol.professionalId === professionalId),
  );
}

protocolTitleById(protocolId: string | null): string {
  if (!protocolId) return 'Sem protocolo';
  return (
    [...this.availableProtocols(), ...this.protocols()].find(
      (protocol) => protocol.id === protocolId,
    )?.title ?? `Protocolo ${this.shortId(protocolId)}`
  );
}

substanceNameById(substanceId: string | null): string {
  if (!substanceId) return 'Sem substância vinculada';
  return (
    this.substances().find((substance) => substance.id === substanceId)?.name ??
    `Item ${this.shortId(substanceId)}`
  );
}

onTrackingAthleteChange(): void {
  this.trackingForm.controls.protocolId.setValue('');
}

onCheckInProfessionalChange(): void {
  const protocols = this.checkInProtocols();
  this.checkInForm.controls.protocolId.setValue(
    protocols.length === 1 ? protocols[0].id : '',
  );
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
private loadSubstances(): void {
  this.operations
    .listSubstances({
      active: true,
      page: 1,
      limit: 100,
      sortBy: 'name',
      sortOrder: 'asc',
    })
    .pipe(
      takeUntilDestroyed(this.destroyRef),
    )
    .subscribe({
      next: (response) => {
        this.substances.set(response.data);
      },

      error: (error: unknown) => {
        this.substances.set([]);
        this.actionError.set(this.resolveErrorMessage(error));
      },
    });
}
private loadAccessibleLinks(): void {
  const user = this.auth.currentUser();

  if (!user || user.role === 'admin' || this.professionalIsPending()) {
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
        this.professionalAthleteLinks.set(response.data);
        if (user.role === 'athlete') {
          const links = response.data.filter((link) => link.status === 'active');
          if (links.length === 1) {
            this.checkInForm.controls.professionalId.setValue(
              links[0].professionalId,
            );
            this.onCheckInProfessionalChange();
          }
        }
      },
      error: (error: unknown) => {
        this.professionalAthleteLinks.set([]);
        this.actionError.set(this.resolveErrorMessage(error));
      },
    });
}

private loadAvailableProtocols(): void {
  const user = this.auth.currentUser();
  if (!user || user.role === 'admin' || this.professionalIsPending()) {
    this.availableProtocols.set([]);
    return;
  }

  this.operations
    .listProtocols({ limit: 100, sortBy: 'createdAt', sortOrder: 'desc' })
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (response) => {
        this.availableProtocols.set(response.data);
        if (user.role === 'athlete') this.onCheckInProfessionalChange();
      },
      error: (error: unknown) => {
        this.availableProtocols.set([]);
        this.actionError.set(this.resolveErrorMessage(error));
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
    if (this.actionLoading()) return;
    this.actionLoading.set(true);
    this.actionError.set('');
    this.successMessage.set('');

    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.actionLoading.set(false)),
      )
      .subscribe({
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

  private createProtocolItemForm(
    item: Partial<ProtocolItemPayload> = {},
  ): ProtocolItemForm {
    return new FormGroup({
      substanceId: new FormControl(item.substanceId ?? '', {
        nonNullable: true,
        validators: Validators.required,
      }),
      instructions: new FormControl(item.instructions ?? '', {
        nonNullable: true,
      }),
      frequencyType: new FormControl<ProtocolFrequencyType>(
        item.frequencyType ?? 'daily',
        { nonNullable: true, validators: Validators.required },
      ),
      weekDays: new FormControl<number[]>(item.weekDays ?? [], {
        nonNullable: true,
      }),
      time: new FormControl(item.time ?? '08:00', { nonNullable: true }),
      startDate: new FormControl(
        this.dateInputValue(item.startDate ?? null),
        { nonNullable: true },
      ),
      endDate: new FormControl(this.dateInputValue(item.endDate ?? null), {
        nonNullable: true,
      }),
      active: new FormControl(item.active ?? true, { nonNullable: true }),
      });
  }

  private protocolItemArray(
    target: 'protocol' | 'version',
  ): FormArray<ProtocolItemForm> {
    return target === 'version' ? this.protocolVersionItems : this.protocolItems;
  }

  private protocolItemsPayload(
    items: FormArray<ProtocolItemForm>,
  ): ProtocolItemPayload[] {
    return items.controls.map((item) => {
      const value = item.getRawValue();
      return {
        substanceId: value.substanceId.trim(),
        instructions: this.nullableText(value.instructions),
        frequencyType: value.frequencyType,
        weekDays: value.frequencyType === 'weekly' ? value.weekDays : [],
        time: this.nullableText(value.time),
        startDate: this.toIsoOrNull(value.startDate),
        endDate: this.toIsoOrNull(value.endDate),
        active: value.active,
      };
    });
  }

  private validateProtocolItems(items: FormArray<ProtocolItemForm>): boolean {
    if (!items.length) {
      this.actionError.set('O protocolo precisa ter ao menos um item.');
      return false;
    }

    for (const item of items.controls) {
      const value = item.getRawValue();
      if (!value.substanceId.trim()) return false;
      if (
        value.frequencyType === 'weekly' &&
        (!value.weekDays.length ||
          value.weekDays.some((day) => !Number.isInteger(day) || day < 1 || day > 7))
      ) {
        this.actionError.set(
          'Selecione ao menos um dia válido para cada item semanal.',
        );
        return false;
      }
    }
    return true;
  }

  private replaceProtocolItems(
    target: FormArray<ProtocolItemForm>,
    items: ProtocolItem[],
  ): void {
    target.clear();
    for (const item of items) {
      target.push(this.createProtocolItemForm(item));
    }
    if (!target.length) target.push(this.createProtocolItemForm());
  }

  private protocolItemsChanged(
    nextItems: ProtocolItemPayload[],
    currentItems: ProtocolItem[],
  ): boolean {
    const normalize = (
      item: ProtocolItemPayload | ProtocolItem,
    ): ProtocolItemPayload => ({
      substanceId: item.substanceId,
      instructions: item.instructions || null,
      frequencyType: item.frequencyType,
      weekDays: [...item.weekDays].sort((left, right) => left - right),
      time: item.time || null,
      startDate: item.startDate ? new Date(item.startDate).toISOString() : null,
      endDate: item.endDate ? new Date(item.endDate).toISOString() : null,
      active: item.active,
    });
    return (
      JSON.stringify(nextItems.map(normalize)) !==
      JSON.stringify(currentItems.map(normalize))
    );
  }

  private resetProtocolForm(): void {
    this.editingProtocolId.set('');
    this.protocolForm.reset({
      athleteId: '',
      continuous: true,
      endDate: '',
      objective: '',
      startDate: this.todayInputValue(),
      title: '',
    });
    this.protocolItems.clear();
    this.protocolItems.push(this.createProtocolItemForm());
  }

  private resetProtocolVersionForm(): void {
    this.protocolVersionForm.reset({
      changeReason: '',
      continuous: 'keep',
      endDate: '',
      includeItems: false,
      protocolId: '',
      startDate: '',
    });
    this.protocolVersionItems.clear();
    this.selectedProtocolVersion.set(null);
    this.selectedProtocolId.set('');
  }

  private dateInputValue(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  private sameDateValue(
    left: string | null | undefined,
    right: string | null | undefined,
  ): boolean {
    if (!left && !right) return true;
    if (!left || !right) return false;
    const leftDate = new Date(left);
    const rightDate = new Date(right);
    if (
      Number.isNaN(leftDate.getTime()) ||
      Number.isNaN(rightDate.getTime())
    ) {
      return left === right;
    }
    return leftDate.getTime() === rightDate.getTime();
  }

  private openPrivatePdf(
    entityId: string,
    request: Observable<Blob>,
    fileName: string,
  ): void {
    this.documentLoadingId.set(entityId);
    this.actionError.set('');
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.documentLoadingId.set('')),
      )
      .subscribe({
        next: (document) => {
          const objectUrl = URL.createObjectURL(document);
          const openedWindow = window.open(objectUrl, '_blank', 'noopener,noreferrer');
          if (!openedWindow) {
            const link = window.document.createElement('a');
            link.href = objectUrl;
            link.download = fileName;
            link.click();
          }
          window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        },
        error: (error: unknown) =>
          this.actionError.set(this.resolveErrorMessage(error)),
      });
  }

  private resetNewSubstanceForm(): void {
    this.newSubstanceForm.reset({
      name: '',
      description: '',
      category: '',
      defaultUnit: '',
    });
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
      const fields = response?.error?.fields;
      const fieldMessages = Array.isArray(fields)
        ? fields
            .map((field) => {
              if (!field || typeof field !== 'object') return '';
              const detail = field as Record<string, unknown>;
              return typeof detail['message'] === 'string'
                ? detail['message'].trim()
                : '';
            })
            .filter(Boolean)
        : [];
      if (typeof message === 'string' && message.trim()) {
        return fieldMessages.length
          ? `${message.trim()} ${fieldMessages.join(' ')}`
          : message.trim();
      }
      if (error.status === 401) return 'Sua sessão expirou. Entre novamente.';
      if (error.status === 403) return 'Você não possui permissão para esta ação.';
      if (error.status === 404) return 'O arquivo ou registro não foi encontrado.';
    }

    return 'Não foi possível concluir a operação agora. Tente novamente.';
  }
}
