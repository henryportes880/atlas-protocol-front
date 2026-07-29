import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  catchError,
  finalize,
  map,
  Observable,
  of,
  shareReplay,
  tap,
  throwError,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  AuthUser,
  LoginRequest,
  MeResponse,
  ProfessionalAuthUser,
  ProfessionalRegisterResponse,
  RegisterProfessionalRequest,
  RegisterRequest,
} from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenKey = 'atlas_token';
  private readonly userKey = 'atlas_user';
  private sessionValidated = false;
  private sessionRequest: Observable<AuthUser | null> | null = null;

  readonly currentUser = signal<AuthUser | null>(this.readStoredUser());

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload).pipe(
      tap((response) => this.persistSession(response.data.token, response.data.user)),
    );
  }

  register(payload: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, payload).pipe(
      tap((response) => this.persistSession(response.data.token, response.data.user)),
    );
  }

  registerProfessional(
    payload: RegisterProfessionalRequest,
  ): Observable<ProfessionalRegisterResponse> {
    const formData = new FormData();
    formData.append('name', payload.name);
    formData.append('email', payload.email);
    formData.append('password', payload.password);
    formData.append('document', payload.document, payload.document.name);

    return this.http
      .post<ProfessionalRegisterResponse>(
        `${environment.apiUrl}/auth/register-professional`,
        formData,
      )
      .pipe(
        tap((response) => {
          const user: ProfessionalAuthUser = {
            ...response.data.user,
            verificationStatus: response.data.verification.status,
          };

          this.persistSession(response.data.token, user);
        }),
      );
  }

  me(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${environment.apiUrl}/auth/me`).pipe(
      tap((response) => this.persistCurrentUser(response.data.user)),
    );
  }

  ensureSession(): Observable<AuthUser | null> {
    const token = this.getToken();

    if (!token) {
      this.clearSession();
      return of(null);
    }

    if (this.sessionValidated) {
      return of(this.currentUser());
    }

    if (this.sessionRequest) {
      return this.sessionRequest;
    }

    let request: Observable<AuthUser | null>;
    request = this.http
      .get<MeResponse>(`${environment.apiUrl}/auth/me`)
      .pipe(
      map((response) => {
        if (this.getToken() !== token) return null;

        this.persistCurrentUser(response.data.user);
        this.sessionValidated = true;
        return response.data.user;
      }),
      catchError((error: unknown) => {
        if (
          error instanceof HttpErrorResponse &&
          (error.status === 401 || error.status === 403)
        ) {
          this.clearSession();
        }

        return throwError(() => error);
      }),
      finalize(() => {
        if (this.sessionRequest === request) {
          this.sessionRequest = null;
        }
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.sessionRequest = request;
    return request;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return Boolean(this.getToken());
  }

  logout(): void {
    this.clearSession();
  }

  private clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUser.set(null);
    this.sessionValidated = false;
    this.sessionRequest = null;
  }

  private persistSession(token: string, user: AuthUser): void {
    localStorage.setItem(this.tokenKey, token);
    this.persistCurrentUser(user);
    this.sessionValidated = true;
  }

  private persistCurrentUser(user: AuthUser): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.currentUser.set(user);
  }

  private readStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) return null;
    try {
      const value: unknown = JSON.parse(raw);
      return this.isAuthUser(value) ? value : null;
    } catch {
      return null;
    }
  }

  private isAuthUser(value: unknown): value is AuthUser {
    if (!value || typeof value !== 'object') return false;

    const user = value as Record<string, unknown>;
    const baseIsValid =
      typeof user['id'] === 'string' &&
      typeof user['name'] === 'string' &&
      typeof user['email'] === 'string' &&
      typeof user['active'] === 'boolean' &&
      ['admin', 'professional', 'athlete'].includes(String(user['role']));

    if (!baseIsValid) return false;
    if (user['role'] !== 'professional') return true;

    return ['pending', 'approved', 'rejected'].includes(
      String(user['verificationStatus']),
    );
  }
}
