import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { AuthVisual } from '../../../shared/auth/auth-visual/auth-visual';
import { AtlasBrand } from '../../../shared/ui/atlas-brand/atlas-brand';
import { AtlasIcon } from '../../../shared/ui/atlas-icon/atlas-icon';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AuthVisual, AtlasBrand, AtlasIcon],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  name = '';
  email = '';
  password = '';
  showPassword = false;
  loading = false;
  error = '';

  submit(): void {
    if (this.loading) return;

    this.loading = true;
    this.error = '';

    this.auth
      .register({ name: this.name.trim(), email: this.email.trim(), password: this.password })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => this.router.navigateByUrl('/app'),
        error: (err) => {
          this.error = err?.error?.error?.message ?? 'Não foi possível criar sua conta.';
        },
      });
  }
}
