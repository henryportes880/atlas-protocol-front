import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  Router,
} from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthUser } from '../../core/models/auth.model';
import { AuthService } from '../../core/services/auth.service';
import { OperationsService } from '../../core/services/operations.service';
import { OperationsPage } from './operations-page';

describe('OperationsPage', () => {
  let fixture: ComponentFixture<OperationsPage>;
  let operationsService: {
    listLinks: ReturnType<typeof vi.fn>;
  };

  const professionalUser: AuthUser = {
    id: 'professional-1',
    name: 'Pro Atlas',
    email: 'pro@example.com',
    role: 'professional',
    active: true,
    verificationStatus: 'approved',
  };

  beforeEach(async () => {
    operationsService = {
      listLinks: vi.fn(() =>
        of({
          success: true,
          data: [
            {
              id: 'link-1',
              professionalId: 'professional-1',
              athleteId: 'athlete-1',
              athlete: {
  id: 'athlete-1',
  name: 'Rafael Atleta Demo',
  email: 'atleta.demo@atlasprotocol.com',
},
              status: 'active',
              requestedAt: '2026-07-29T12:00:00.000Z',
              acceptedAt: '2026-07-29T12:10:00.000Z',
              rejectedAt: null,
              endedAt: null,
              endedBy: null,
              createdAt: '2026-07-29T12:00:00.000Z',
              updatedAt: '2026-07-29T12:10:00.000Z',
            },
          ],
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [OperationsPage],
      providers: [
        { provide: OperationsService, useValue: operationsService },
        { provide: AuthService, useValue: { currentUser: vi.fn(() => professionalUser) } },
        {
  provide: Router,
  useValue: {
    navigate: vi.fn(),
  },
},
        {
  provide: ActivatedRoute,
  useValue: {
    data: of({ module: 'links' }),
    queryParamMap: of(
      convertToParamMap({}),
    ),
  },
},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OperationsPage);
    fixture.detectChanges();
  });

  it('carrega o módulo de vínculos usando dados da rota', () => {
    const content = fixture.nativeElement.textContent;

    expect(operationsService.listLinks).toHaveBeenCalledWith({ limit: 20, status: '' });
    expect(
  operationsService.listLinks,
).toHaveBeenCalledWith({
  status: 'active',
  page: 1,
  limit: 100,
});
    expect(content).toContain('Vínculos');
    expect(content).toContain('Rafael Atleta Demo');
  });
});
