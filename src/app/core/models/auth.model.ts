import { ApiSuccess } from './api.model';

export type UserRole = 'admin' | 'professional' | 'athlete';

interface BaseAuthUser {
  id: string;
  name: string;
  email: string;
  active: boolean;
}

export interface AthleteAuthUser extends BaseAuthUser {
  role: 'athlete';
}

export interface AdminAuthUser extends BaseAuthUser {
  role: 'admin';
}

export interface ProfessionalAuthUser extends BaseAuthUser {
  role: 'professional';
  verificationStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export type AuthUser =
  | AthleteAuthUser
  | AdminAuthUser
  | ProfessionalAuthUser;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export type AuthResponse = ApiSuccess<{
    user: AuthUser;
    token: string;
  }>;

export type MeResponse = ApiSuccess<{
    user: AuthUser;
  }>;
