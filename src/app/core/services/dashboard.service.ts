import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from '../models/api.model';
import { DashboardData } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  getDashboard(): Observable<ApiSuccess<DashboardData>> {
    return this.http.get<ApiSuccess<DashboardData>>(
      `${environment.apiUrl}/dashboard`,
    );
  }
}
