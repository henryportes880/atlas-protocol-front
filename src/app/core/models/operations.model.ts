// Contracts mirrored from the backend module branches.
import { UserRole, VerificationStatus } from './auth.model';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type OperationQueryValue = string | number | boolean | null | undefined;
export type OperationQuery = Record<string, OperationQueryValue>;

export type LinkStatus = 'active' | 'ended' | 'pending' | 'rejected';

export interface LinkRecord {
  id: string;
  professionalId: string;
  athleteId: string;
  athlete?: LinkedAthleteSummary | null;
  status: LinkStatus;
  requestedAt: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  endedAt: string | null;
  endedBy: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface LinkedAthleteSummary {
  id: string;
  name: string;
  email: string;
}

export type ProtocolStatus =
  | 'active'
  | 'cancelled'
  | 'closed'
  | 'draft'
  | 'paused';
export type ProtocolFrequencyType = 'custom' | 'daily' | 'weekly';

export interface ProtocolRecord {
  id: string;
  athleteId: string;
  professionalId: string;
  title: string;
  objective: string | null;
  status: ProtocolStatus;
  currentVersion: number;
  startDate: string;
  endDate: string | null;
  continuous: boolean;
  activatedAt: string | null;
  pausedAt: string | null;
  closedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProtocolItem {
  id: string;
  substanceId: string;
  substanceSnapshot: {
    name?: string;
    category?: string;
    defaultUnit?: string | null;
  };
  instructions: string | null;
  frequencyType: ProtocolFrequencyType;
  weekDays: number[];
  time: string | null;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
}

export interface ProtocolVersionRecord {
  id: string;
  protocolId: string;
  version: number;
  createdBy: string;
  changeReason: string | null;
  startDate: string | null;
  endDate: string | null;
  continuous: boolean;
  items: ProtocolItem[];
  createdAt: string;
}

export interface ProtocolMutationResult {
  protocol: ProtocolRecord;
  currentVersion: ProtocolVersionRecord;
}

export type TrackingRecordType = 'manual' | 'scheduled';
export type TrackingRecordStatus =
  | 'cancelled'
  | 'completed'
  | 'missed'
  | 'scheduled';

export interface TrackingRecord {
  id: string;
  athleteId: string | null;
  professionalId: string | null;
  protocolId: string | null;
  protocolVersion: number | null;
  type: TrackingRecordType;
  title: string;
  scheduledFor: string;
  status: TrackingRecordStatus;
  statusReason: string | null;
  completedAt: string | null;
  completedBy: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CheckInStatus = 'pending' | 'reviewed' | 'submitted';
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = Record<string, JsonValue>;

export interface CheckInRecord {
  id: string;
  athleteId: string;
  professionalId: string | null;
  protocolId: string | null;
  referenceWeek: string;
  status: CheckInStatus;
  responses: JsonObject;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewComment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExamResult {
  marker: string;
  value: string;
  unit: string | null;
  referenceRange: string | null;
}

export interface ExamRecord {
  id: string;
  athleteId: string | null;
  professionalId: string | null;
  title: string;
  examDate: string;
  laboratory: string | null;
  results: ExamResult[];
  document: {
    originalName: string;
    mimeType: 'application/pdf';
    sizeBytes: number;
  } | null;
  notes: string | null;
  archivedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PhysicalMeasurements {
  chestCm: number | null;
  waistCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  calfCm: number | null;
}

export interface PhysicalProgressRecord {
  id: string;
  athleteId: string | null;
  recordedBy: string | null;
  referenceDate: string;
  weightKg: number | null;
  bodyFatPercent: number | null;
  measurements: PhysicalMeasurements;
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type HistoryEventType =
  | 'checkin'
  | 'exam'
  | 'progress'
  | 'protocol_status'
  | 'protocol_version'
  | 'tracking';

export interface HistoryItem {
  id: string;
  type: HistoryEventType;
  occurredAt: string;
  title: string;
  summary: string;
  entityId: string;
}

export type InventoryUnit =
  | 'box'
  | 'capsule'
  | 'g'
  | 'mg'
  | 'ml'
  | 'tablet'
  | 'unit'
  | 'vial';
export type InventoryMovementType = 'adjustment' | 'in' | 'out';

export interface InventoryItem {
  id: string;
  athleteId: string | null;
  substanceId: string | null;
  name: string;
  unit: InventoryUnit;
  quantity: number;
  lowStockThreshold: number | null;
  expirationDate: string | null;
  archivedAt: string | null;
  lowStock: boolean;
  expired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  inventoryItemId: string;
  athleteId: string | null;
  type: InventoryMovementType;
  quantity: number;
  previousQuantity: number;
  resultingQuantity: number;
  reason: string;
  createdBy: string | null;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
}

export interface AdminProfessionalVerification {
  id: string;
  userId: string;
  user: UserRecord | null;
  verificationStatus: VerificationStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
  verificationDocument?: {
    originalName: string;
    mimeType: 'application/pdf';
    sizeBytes: number;
  } | null;
}

export interface AuditLogRecord {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: JsonObject;
  ipHash: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type OperationRecord =
  | CheckInRecord
  | ExamRecord
  | HistoryItem
  | InventoryItem
  | LinkRecord
  | NotificationRecord
  | PhysicalProgressRecord
  | ProtocolRecord
  | TrackingRecord;
