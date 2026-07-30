import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { ProfessionalVerificationService } from './professional-verification.service';

describe('ProfessionalVerificationService', () => {
  it('consulta o status profissional próprio', () => {
    TestBed.configureTestingModule({
      providers: [
        ProfessionalVerificationService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const service = TestBed.inject(ProfessionalVerificationService);
    const http = TestBed.inject(HttpTestingController);

    service.getOwnVerification().subscribe((response) => {
      expect(response.data.verification.verificationStatus).toBe('pending');
      expect(
        response.data.verification.verificationDocument?.originalName,
      ).toBe('comprovante.pdf');
    });

    const request = http.expectOne(
      `${environment.apiUrl}/professional-verifications/me`,
    );
    expect(request.request.method).toBe('GET');
    request.flush({
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
      message: 'Verificação profissional obtida com sucesso.',
    });
    http.verify();
  });
});
