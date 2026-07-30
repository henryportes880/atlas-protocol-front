import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let redirectInProgress = false;

function isPublicAuthRequest(url: string): boolean {
  return [
    '/auth/login',
    '/auth/register',
    '/auth/register-professional',
  ].some((path) => url.endsWith(path));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();
  const request = token
    ? req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      })
    : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isPublicAuthRequest(req.url)
      ) {
        const returnUrl = router.url.startsWith('/app')
          ? router.url
          : null;

        auth.logout();

        if (!router.url.startsWith('/login') && !redirectInProgress) {
          redirectInProgress = true;
          void router
            .navigate(['/login'], {
              queryParams: returnUrl ? { returnUrl } : undefined,
            })
            .finally(() => {
              redirectInProgress = false;
            });
        }
      }

      return throwError(() => error);
    }),
  );
};
