import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const loginTree = () =>
    router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });

  if (!auth.getToken()) return loginTree();

  return auth.ensureSession().pipe(
    map((user) => (user ? true : loginTree())),
    catchError(() => of(false)),
  );
};
