export type DashboardRole = 'admin' | 'professional' | 'athlete';
export type ProfessionalVerificationStatus = 'approved' | 'pending' | 'rejected';
export type TrackingType = 'scheduled' | 'manual';
export type TrackingStatus = 'scheduled' | 'completed' | 'missed' | 'cancelled';
export type CheckInStatus = 'pending' | 'submitted' | 'reviewed';
export type ActivityType = 'protocol' | 'tracking' | 'check_in';

export interface AthleteActiveProtocol {
  id: string;
  title: string;
  status: 'active';
  professionalId: string;
  currentVersion: number;
  startDate: string;
  endDate: string | null;
  continuous: boolean;
  activatedAt: string | null;
}

export interface AthleteNextTracking {
  id: string;
  title: string;
  type: TrackingType;
  scheduledFor: string;
  status: 'scheduled';
  protocolId: string | null;
  professionalId: string | null;
}

export interface AthleteCurrentCheckIn {
  id: string;
  professionalId: string;
  protocolId: string | null;
  referenceWeek: string;
  status: CheckInStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
}

export interface AthleteRecentActivity {
  id: string;
  type: ActivityType;
  occurredAt: string;
  title: string;
  status: string | null;
  entityId: string;
}

export interface AthleteDashboardData {
  role: 'athlete';
  activeProtocol: AthleteActiveProtocol | null;
  nextTracking: AthleteNextTracking | null;
  currentCheckIn: AthleteCurrentCheckIn | null;
  recentActivity: AthleteRecentActivity[];
  unreadNotifications: number;
  inventoryAlerts: unknown[];
}

export interface ProfessionalUpcomingTracking {
  id: string;
  athleteId: string;
  protocolId: string | null;
  title: string;
  type: TrackingType;
  scheduledFor: string;
  status: 'scheduled';
}

export interface ProfessionalRecentActivity extends AthleteRecentActivity {
  athleteId: string;
}

export interface ProfessionalDashboardData {
  role: 'professional';
  verificationStatus: ProfessionalVerificationStatus;
  athleteCount: number;
  activeProtocols: number;
  pendingCheckIns: number;
  upcomingTrackings: ProfessionalUpcomingTracking[];
  recentActivity: ProfessionalRecentActivity[];
}

export interface AdminRecentAudit {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
}

export interface AdminDashboardData {
  role: 'admin';
  users: {
    total: number;
    active: number;
    blocked: number;
    byRole: {
      admin: number;
      professional: number;
      athlete: number;
    };
  };
  professionalsPending: number;
  activeLinks: number;
  recentAudit: AdminRecentAudit[];
}

export type DashboardData =
  | AthleteDashboardData
  | ProfessionalDashboardData
  | AdminDashboardData;
