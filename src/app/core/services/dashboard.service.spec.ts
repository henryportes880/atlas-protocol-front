import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { AthleteDashboardData } from '../models/dashboard.model';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  it('consulta GET /dashboard usando environment.apiUrl', () => {
    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const service = TestBed.inject(DashboardService);
    const http = TestBed.inject(HttpTestingController);
    const data: AthleteDashboardData = {
      role: 'athlete',
      activeProtocol: null,
      nextTracking: null,
      currentCheckIn: null,
      recentActivity: [],
      unreadNotifications: 0,
      inventoryAlerts: [],
    };

    service.getDashboard().subscribe((response) => {
      expect(response.success).toBe(true);
      expect(response.data.role).toBe('athlete');
    });

    const request = http.expectOne(`${environment.apiUrl}/dashboard`);
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, data });
    http.verify();
  });
});
