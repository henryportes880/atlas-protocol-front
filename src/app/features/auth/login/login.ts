import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { AtlasBrand } from '../../../shared/ui/atlas-brand/atlas-brand';
import { AtlasIcon } from '../../../shared/ui/atlas-icon/atlas-icon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AtlasBrand, AtlasIcon],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  email = '';
  password = '';
  showPassword = false;
  loading = false;
  error = '';

  submit(): void {
    if (this.loading) return;

    this.error = '';
    this.loading = true;

    this.auth
      .login({ email: this.email.trim(), password: this.password })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => this.router.navigateByUrl(this.safeReturnUrl()),
        error: (err) => {
          this.error = err?.error?.error?.message ?? 'Não foi possível entrar. Verifique seus dados.';
        },
      });
  }

  private safeReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl?.startsWith('/app') ? returnUrl : '/app/dashboard';
  }
}
