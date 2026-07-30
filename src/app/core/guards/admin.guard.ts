import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const loginTree = () =>
    router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  const dashboardTree = () => router.createUrlTree(['/app/dashboard']);

  if (!auth.getToken()) return loginTree();

  return auth.ensureSession().pipe(
    map((user) => {
      if (!user) return loginTree();
      return user.role === 'admin' ? true : dashboardTree();
    }),
    catchError(() => of(loginTree())),
  );
};
