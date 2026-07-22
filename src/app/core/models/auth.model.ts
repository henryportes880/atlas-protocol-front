export type UserRole = 'admin' | 'professional' | 'athlete';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: AuthUser;
    token: string;
  };
  message?: string;
}

export interface MeResponse {
  success: boolean;
  data: {
    user: AuthUser;
  };
}
