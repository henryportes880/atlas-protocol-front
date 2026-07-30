// Centralized client for the remaining Atlas operational modules.
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess, PaginatedResponse } from '../models/api.model';
import {
  AdminProfessionalVerification,
  AuditLogRecord,
  CheckInRecord,
  ExamRecord,
  ExamResult,
  HistoryItem,
  InventoryItem,
  InventoryMovement,
  InventoryMovementType,
  InventoryUnit,
  JsonObject,
  LinkRecord,
  NotificationRecord,
  OperationQuery,
  PhysicalMeasurements,
  PhysicalProgressRecord,
  ProtocolMutationResult,
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
} from '../models/operations.model';
export interface ProtocolItemPayload {
  substanceId: string;
  instructions: string | null;
  frequencyType: ProtocolFrequencyType;
  weekDays: number[];
  time: string | null;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
}
export interface CreateProtocolPayload {
  athleteId: string;
  title: string;
  objective?: string | null;
  startDate: string;
  endDate?: string | null;
  continuous: boolean;
  items: ProtocolItemPayload[];
}

export interface CreateSubstancePayload {
  name: string;
  description: string | null;
  category: SubstanceCategory;
  defaultUnit: InventoryUnit | null;
}

export interface CreateTrackingRecordPayload {
  athleteId?: string;
  protocolId?: string | null;
  type: TrackingRecordType;
  title: string;
  scheduledFor: string;
  notes?: string | null;
}

export interface CreateCheckInPayload {
  protocolId?: string | null;
  professionalId?: string;
  referenceWeek: string;
  responses: JsonObject;
}

export interface CreateExamPayload {
  athleteId?: string;
  title: string;
  examDate: string;
  laboratory?: string | null;
  notes?: string | null;
  results: ExamResult[];
  document?: File | null;
}

export interface CreatePhysicalProgressPayload {
  athleteId?: string;
  referenceDate: string;
  weightKg: number | null;
  bodyFatPercent: number | null;
  measurements: PhysicalMeasurements;
  notes: string | null;
}

export interface CreateInventoryItemPayload {
  substanceId: string | null;
  name: string;
  unit: InventoryUnit;
  quantity: number;
  lowStockThreshold: number | null;
  expirationDate: string | null;
}

@Injectable({ providedIn: 'root' })
export class OperationsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listLinks(query: OperationQuery = {}): Observable<PaginatedResponse<LinkRecord>> {
    return this.http.get<PaginatedResponse<LinkRecord>>(`${this.apiUrl}/links`, {
      params: this.params(query),
    });
  }

  createLink(athleteEmail: string): Observable<ApiSuccess<LinkRecord>> {
    return this.http.post<ApiSuccess<LinkRecord>>(`${this.apiUrl}/links`, {
      athleteEmail,
    });
  }

  acceptLink(id: string): Observable<ApiSuccess<LinkRecord>> {
    return this.http.patch<ApiSuccess<LinkRecord>>(
      `${this.apiUrl}/links/${id}/accept`,
      {},
    );
  }

  rejectLink(id: string, reason?: string): Observable<ApiSuccess<LinkRecord>> {
    return this.http.patch<ApiSuccess<LinkRecord>>(
      `${this.apiUrl}/links/${id}/reject`,
      this.optionalReason(reason),
    );
  }

  endLink(id: string, reason?: string): Observable<ApiSuccess<LinkRecord>> {
    return this.http.patch<ApiSuccess<LinkRecord>>(
      `${this.apiUrl}/links/${id}/end`,
      this.optionalReason(reason),
    );
  }
  listSubstances(
    query: OperationQuery = {},
  ): Observable<PaginatedResponse<SubstanceRecord>> {
    return this.http.get<PaginatedResponse<SubstanceRecord>>(
      `${this.apiUrl}/substances`,
      {
        params: this.params(query),
      },
    );
  }

  createSubstance(
    payload: CreateSubstancePayload,
  ): Observable<ApiSuccess<{ substance: SubstanceRecord }>> {
    return this.http.post<ApiSuccess<{ substance: SubstanceRecord }>>(
      `${this.apiUrl}/substances`,
      payload,
    );
  }

  listProtocols(
    query: OperationQuery = {},
  ): Observable<PaginatedResponse<ProtocolRecord>> {
    return this.http.get<PaginatedResponse<ProtocolRecord>>(
      `${this.apiUrl}/protocols`,
      { params: this.params(query) },
    );
  }

  createProtocol(
    payload: CreateProtocolPayload,
  ): Observable<ApiSuccess<ProtocolMutationResult>> {
    return this.http.post<ApiSuccess<ProtocolMutationResult>>(
      `${this.apiUrl}/protocols`,
      payload,
    );
  }

  updateProtocolStatus(
    id: string,
    status: ProtocolStatus,
    reason?: string,
  ): Observable<ApiSuccess<{ protocol: ProtocolRecord }>> {
    return this.http.patch<ApiSuccess<{ protocol: ProtocolRecord }>>(
      `${this.apiUrl}/protocols/${id}/status`,
      { status, ...this.optionalReason(reason) },
    );
  }

  listProtocolVersions(
    protocolId: string,
  ): Observable<ApiSuccess<ProtocolVersionRecord[]>> {
    return this.http.get<ApiSuccess<ProtocolVersionRecord[]>>(
      `${this.apiUrl}/protocols/${protocolId}/versions`,
    );
  }

  createProtocolVersion(
    protocolId: string,
    payload: Partial<Pick<CreateProtocolPayload, 'continuous' | 'endDate' | 'startDate'>> & {
      changeReason?: string | null;
      items?: ProtocolItemPayload[];
    },
  ): Observable<ApiSuccess<ProtocolMutationResult>> {
    return this.http.post<ApiSuccess<ProtocolMutationResult>>(
      `${this.apiUrl}/protocols/${protocolId}/versions`,
      payload,
    );
  }

  listTrackingRecords(
    query: OperationQuery = {},
  ): Observable<PaginatedResponse<TrackingRecord>> {
    return this.http.get<PaginatedResponse<TrackingRecord>>(
      `${this.apiUrl}/tracking-records`,
      { params: this.params(query) },
    );
  }

  createTrackingRecord(
    payload: CreateTrackingRecordPayload,
  ): Observable<ApiSuccess<TrackingRecord>> {
    return this.http.post<ApiSuccess<TrackingRecord>>(
      `${this.apiUrl}/tracking-records`,
      payload,
    );
  }

  transitionTrackingRecord(
    id: string,
    payload: {
      status: TrackingRecordStatus;
      completedAt?: string;
      notes?: string | null;
      reason?: string;
    },
  ): Observable<ApiSuccess<TrackingRecord>> {
    return this.http.patch<ApiSuccess<TrackingRecord>>(
      `${this.apiUrl}/tracking-records/${id}/status`,
      payload,
    );
  }

  listCheckIns(
    query: OperationQuery = {},
  ): Observable<PaginatedResponse<CheckInRecord>> {
    return this.http.get<PaginatedResponse<CheckInRecord>>(
      `${this.apiUrl}/check-ins`,
      { params: this.params(query) },
    );
  }

  createCheckIn(payload: CreateCheckInPayload): Observable<ApiSuccess<CheckInRecord>> {
    return this.http.post<ApiSuccess<CheckInRecord>>(
      `${this.apiUrl}/check-ins`,
      payload,
    );
  }

  submitCheckIn(id: string): Observable<ApiSuccess<CheckInRecord>> {
    return this.http.patch<ApiSuccess<CheckInRecord>>(
      `${this.apiUrl}/check-ins/${id}/submit`,
      {},
    );
  }

  reviewCheckIn(
    id: string,
    reviewComment: string,
  ): Observable<ApiSuccess<CheckInRecord>> {
    return this.http.patch<ApiSuccess<CheckInRecord>>(
      `${this.apiUrl}/check-ins/${id}/review`,
      { reviewComment },
    );
  }

  listExams(query: OperationQuery = {}): Observable<PaginatedResponse<ExamRecord>> {
    return this.http.get<PaginatedResponse<ExamRecord>>(`${this.apiUrl}/exams`, {
      params: this.params(query),
    });
  }

  createExam(payload: CreateExamPayload): Observable<ApiSuccess<ExamRecord>> {
    const formData = new FormData();
    this.appendIfPresent(formData, 'athleteId', payload.athleteId);
    formData.append('title', payload.title);
    formData.append('examDate', payload.examDate);
    this.appendIfPresent(formData, 'laboratory', payload.laboratory);
    this.appendIfPresent(formData, 'notes', payload.notes);
    formData.append('results', JSON.stringify(payload.results));
    if (payload.document) {
      formData.append('document', payload.document, payload.document.name);
    }

    return this.http.post<ApiSuccess<ExamRecord>>(
      `${this.apiUrl}/exams`,
      formData,
    );
  }

  archiveExam(id: string): Observable<ApiSuccess<ExamRecord>> {
    return this.http.patch<ApiSuccess<ExamRecord>>(
      `${this.apiUrl}/exams/${id}/archive`,
      {},
    );
  }

  listPhysicalProgress(
    query: OperationQuery = {},
  ): Observable<PaginatedResponse<PhysicalProgressRecord>> {
    return this.http.get<PaginatedResponse<PhysicalProgressRecord>>(
      `${this.apiUrl}/progress`,
      { params: this.params(query) },
    );
  }

  createPhysicalProgress(
    payload: CreatePhysicalProgressPayload,
  ): Observable<ApiSuccess<PhysicalProgressRecord>> {
    return this.http.post<ApiSuccess<PhysicalProgressRecord>>(
      `${this.apiUrl}/progress`,
      payload,
    );
  }

  archivePhysicalProgress(
    id: string,
  ): Observable<ApiSuccess<PhysicalProgressRecord>> {
    return this.http.patch<ApiSuccess<PhysicalProgressRecord>>(
      `${this.apiUrl}/progress/${id}/archive`,
      {},
    );
  }

  listHistory(query: OperationQuery = {}): Observable<PaginatedResponse<HistoryItem>> {
    return this.http.get<PaginatedResponse<HistoryItem>>(
      `${this.apiUrl}/history`,
      { params: this.params(query) },
    );
  }

  listInventoryItems(
    query: OperationQuery = {},
  ): Observable<PaginatedResponse<InventoryItem>> {
    return this.http.get<PaginatedResponse<InventoryItem>>(
      `${this.apiUrl}/inventory`,
      { params: this.params(query) },
    );
  }

  createInventoryItem(
    payload: CreateInventoryItemPayload,
  ): Observable<ApiSuccess<InventoryItem>> {
    return this.http.post<ApiSuccess<InventoryItem>>(
      `${this.apiUrl}/inventory`,
      payload,
    );
  }

  createInventoryMovement(
    itemId: string,
    payload: {
      type: InventoryMovementType;
      quantity: number;
      reason: string;
    },
  ): Observable<ApiSuccess<InventoryMovement>> {
    return this.http.post<ApiSuccess<InventoryMovement>>(
      `${this.apiUrl}/inventory/${itemId}/movements`,
      payload,
    );
  }

  archiveInventoryItem(id: string): Observable<ApiSuccess<InventoryItem>> {
    return this.http.patch<ApiSuccess<InventoryItem>>(
      `${this.apiUrl}/inventory/${id}/archive`,
      {},
    );
  }

  listNotifications(
    query: OperationQuery = {},
  ): Observable<PaginatedResponse<NotificationRecord>> {
    return this.http.get<PaginatedResponse<NotificationRecord>>(
      `${this.apiUrl}/notifications`,
      { params: this.params(query) },
    );
  }

  markNotificationAsRead(id: string): Observable<ApiSuccess<NotificationRecord>> {
    return this.http.patch<ApiSuccess<NotificationRecord>>(
      `${this.apiUrl}/notifications/${id}/read`,
      {},
    );
  }

  markAllNotificationsAsRead(): Observable<ApiSuccess<{ updatedCount: number }>> {
    return this.http.patch<ApiSuccess<{ updatedCount: number }>>(
      `${this.apiUrl}/notifications/read-all`,
      {},
    );
  }

  archiveNotification(id: string): Observable<ApiSuccess<NotificationRecord>> {
    return this.http.patch<ApiSuccess<NotificationRecord>>(
      `${this.apiUrl}/notifications/${id}/archive`,
      {},
    );
  }

  listUsers(query: OperationQuery = {}): Observable<PaginatedResponse<UserRecord>> {
    return this.http.get<PaginatedResponse<UserRecord>>(`${this.apiUrl}/users`, {
      params: this.params(query),
    });
  }

  setUserBlocked(
    id: string,
    blocked: boolean,
  ): Observable<ApiSuccess<{ user: UserRecord }>> {
    return this.http.patch<ApiSuccess<{ user: UserRecord }>>(
      `${this.apiUrl}/users/${id}/block`,
      { blocked },
    );
  }

  listProfessionalVerifications(
    query: OperationQuery = {},
  ): Observable<PaginatedResponse<AdminProfessionalVerification>> {
    return this.http.get<PaginatedResponse<AdminProfessionalVerification>>(
      `${this.apiUrl}/professional-verifications`,
      { params: this.params(query) },
    );
  }

  approveProfessionalVerification(
    id: string,
  ): Observable<ApiSuccess<{ verification: AdminProfessionalVerification }>> {
    return this.http.patch<
      ApiSuccess<{ verification: AdminProfessionalVerification }>
    >(`${this.apiUrl}/professional-verifications/${id}/approve`, {});
  }

  rejectProfessionalVerification(
    id: string,
    reason: string,
  ): Observable<ApiSuccess<{ verification: AdminProfessionalVerification }>> {
    return this.http.patch<
      ApiSuccess<{ verification: AdminProfessionalVerification }>
    >(`${this.apiUrl}/professional-verifications/${id}/reject`, { reason });
  }

  listAuditLogs(
    query: OperationQuery = {},
  ): Observable<PaginatedResponse<AuditLogRecord>> {
    return this.http.get<PaginatedResponse<AuditLogRecord>>(
      `${this.apiUrl}/audit-logs`,
      { params: this.params(query) },
    );
  }

  private params(query: OperationQuery): HttpParams {
    return Object.entries(query).reduce((params, [key, value]) => {
      if (value === null || value === undefined || value === '') return params;
      return params.set(key, String(value));
    }, new HttpParams());
  }

  private optionalReason(reason: string | undefined): { reason?: string } {
    const cleanReason = reason?.trim();
    return cleanReason ? { reason: cleanReason } : {};
  }

  private appendIfPresent(
    formData: FormData,
    key: string,
    value: string | null | undefined,
  ): void {
    if (value === null || value === undefined || value === '') return;
    formData.append(key, value);
  }
}
