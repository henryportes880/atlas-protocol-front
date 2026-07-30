import { ApiSuccess } from './api.model';
import { VerificationStatus } from './auth.model';

export interface ProfessionalVerificationDocument {
  originalName: string;
  mimeType: 'application/pdf';
  sizeBytes: number;
}

export interface ProfessionalVerification {
  id: string;
  userId: string;
  verificationStatus: VerificationStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
  verificationDocument?: ProfessionalVerificationDocument | null;
}

export type OwnProfessionalVerificationResponse = ApiSuccess<{
  verification: ProfessionalVerification;
}>;
