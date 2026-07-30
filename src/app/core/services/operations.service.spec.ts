import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { OperationsService } from './operations.service';

describe('OperationsService', () => {
  function setup(): {
    http: HttpTestingController;
    service: OperationsService;
  } {
    TestBed.configureTestingModule({
      providers: [
        OperationsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    return {
      http: TestBed.inject(HttpTestingController),
      service: TestBed.inject(OperationsService),
    };
  }

  it('lista vínculos com filtros serializados em query params', () => {
    const { http, service } = setup();

    service
      .listLinks({ status: 'pending', page: 2, limit: 20 })
      .subscribe((response) => {
        expect(response.meta.page).toBe(2);
        expect(response.data[0]?.status).toBe('pending');
      });

    const request = http.expectOne(
      `${environment.apiUrl}/links?status=pending&page=2&limit=20`,
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      success: true,
      data: [
        {
          id: 'link-1',
          professionalId: 'professional-1',
          athleteId: 'athlete-1',
          status: 'pending',
          requestedAt: '2026-07-29T12:00:00.000Z',
          acceptedAt: null,
          rejectedAt: null,
          endedAt: null,
          endedBy: null,
          createdAt: '2026-07-29T12:00:00.000Z',
          updatedAt: '2026-07-29T12:00:00.000Z',
        },
      ],
      meta: { page: 2, limit: 20, total: 1, totalPages: 1 },
    });
    http.verify();
  });

  it('cria substância com payload tipado para uso no protocolo', () => {
    const { http, service } = setup();
    const payload = {
      name: 'Creatina',
      description: 'Item criado durante o protocolo.',
      category: 'supplement' as const,
      defaultUnit: 'g' as const,
    };

    service.createSubstance(payload).subscribe((response) => {
      expect(response.data.substance.name).toBe('Creatina');
    });

    const request = http.expectOne(`${environment.apiUrl}/substances`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({
      success: true,
      data: {
        substance: {
          id: 'substance-1',
          name: 'Creatina',
          description: 'Item criado durante o protocolo.',
          category: 'supplement',
          defaultUnit: 'g',
          active: true,
          createdBy: 'professional-1',
          createdAt: '2026-07-30T12:00:00.000Z',
          updatedAt: '2026-07-30T12:00:00.000Z',
        },
      },
    });
    http.verify();
  });

  it('atualiza rascunho e cria versão sem enviar items quando não alterados', () => {
    const { http, service } = setup();
    const draftPayload = {
      title: 'Protocolo ajustado',
      objective: null,
      startDate: '2026-08-01T00:00:00.000Z',
      endDate: null,
      continuous: true,
      items: [
        {
          substanceId: 'substance-1',
          instructions: null,
          frequencyType: 'daily' as const,
          weekDays: [],
          time: '08:00',
          startDate: null,
          endDate: null,
          active: true,
        },
      ],
    };

    service.updateProtocol('protocol-1', draftPayload).subscribe();
    const updateRequest = http.expectOne(
      `${environment.apiUrl}/protocols/protocol-1`,
    );
    expect(updateRequest.request.method).toBe('PATCH');
    expect(updateRequest.request.body).toEqual(draftPayload);
    updateRequest.flush({ success: true, data: {} });

    service
      .createProtocolVersion('protocol-1', {
        startDate: '2026-08-02T00:00:00.000Z',
      })
      .subscribe();
    const versionRequest = http.expectOne(
      `${environment.apiUrl}/protocols/protocol-1/versions`,
    );
    expect(versionRequest.request.method).toBe('POST');
    expect(versionRequest.request.body).toEqual({
      startDate: '2026-08-02T00:00:00.000Z',
    });
    expect(versionRequest.request.body).not.toHaveProperty('items');
    versionRequest.flush({ success: true, data: {} });
    http.verify();
  });

  it('baixa PDFs privados como blob sem token na URL', () => {
    const { http, service } = setup();

    service.downloadExamDocument('exam-1').subscribe((document) => {
      expect(document.type).toBe('application/pdf');
    });
    const examRequest = http.expectOne(
      `${environment.apiUrl}/exams/exam-1/document`,
    );
    expect(examRequest.request.method).toBe('GET');
    expect(examRequest.request.responseType).toBe('blob');
    examRequest.flush(new Blob(['pdf'], { type: 'application/pdf' }));

    service
      .downloadProfessionalVerificationDocument('verification-1')
      .subscribe();
    const verificationRequest = http.expectOne(
      `${environment.apiUrl}/professional-verifications/verification-1/document`,
    );
    expect(verificationRequest.request.method).toBe('GET');
    expect(verificationRequest.request.responseType).toBe('blob');
    verificationRequest.flush(
      new Blob(['pdf'], { type: 'application/pdf' }),
    );
    http.verify();
  });

  it('envia exame como multipart com results e PDF opcional', () => {
    const { http, service } = setup();
    const document = new File(['%PDF-1.4'], 'exame.pdf', {
      type: 'application/pdf',
    });

    service
      .createExam({
        athleteId: 'athlete-1',
        document,
        examDate: '2026-07-29T00:00:00.000Z',
        laboratory: 'Lab Atlas',
        notes: 'Coleta em jejum',
        results: [{ marker: 'Ferritina', value: '80', unit: 'ng/mL', referenceRange: null }],
        title: 'Hemograma',
      })
      .subscribe((response) => {
        expect(response.data.title).toBe('Hemograma');
      });

    const request = http.expectOne(`${environment.apiUrl}/exams`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body instanceof FormData).toBe(true);
    const body = request.request.body as FormData;
    expect(body.get('title')).toBe('Hemograma');
    expect(body.get('results')).toBe(
      '[{"marker":"Ferritina","value":"80","unit":"ng/mL","referenceRange":null}]',
    );
    expect((body.get('document') as File).name).toBe('exame.pdf');

    request.flush({
      success: true,
      data: {
        id: 'exam-1',
        athleteId: 'athlete-1',
        professionalId: null,
        title: 'Hemograma',
        examDate: '2026-07-29T00:00:00.000Z',
        laboratory: 'Lab Atlas',
        results: [],
        document: null,
        notes: 'Coleta em jejum',
        archivedAt: null,
        createdBy: 'athlete-1',
        createdAt: '2026-07-29T12:00:00.000Z',
        updatedAt: '2026-07-29T12:00:00.000Z',
      },
    });
    http.verify();
  });

  it('executa ações administrativas de verificação profissional', () => {
    const { http, service } = setup();

    service.approveProfessionalVerification('verification-1').subscribe((response) => {
      expect(response.data.verification.verificationStatus).toBe('approved');
    });

    const request = http.expectOne(
      `${environment.apiUrl}/professional-verifications/verification-1/approve`,
    );
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({});
    request.flush({
      success: true,
      data: {
        verification: {
          id: 'verification-1',
          userId: 'professional-1',
          user: null,
          verificationStatus: 'approved',
          submittedAt: '2026-07-29T12:00:00.000Z',
          reviewedAt: '2026-07-29T13:00:00.000Z',
          reviewedBy: 'admin-1',
          createdAt: '2026-07-29T12:00:00.000Z',
          updatedAt: '2026-07-29T13:00:00.000Z',
        },
      },
    });
    http.verify();
  });
});
