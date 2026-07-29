import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OwnProfessionalVerificationResponse } from '../models/professional-verification.model';

@Injectable({ providedIn: 'root' })
export class ProfessionalVerificationService {
  private readonly http = inject(HttpClient);

  getOwnVerification(): Observable<OwnProfessionalVerificationResponse> {
    return this.http.get<OwnProfessionalVerificationResponse>(
      `${environment.apiUrl}/professional-verifications/me`,
    );
  }
}
