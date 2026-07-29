import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { AuthVisual } from '../../../shared/auth/auth-visual/auth-visual';
import { AtlasBrand } from '../../../shared/ui/atlas-brand/atlas-brand';
import { AtlasIcon } from '../../../shared/ui/atlas-icon/atlas-icon';

type AccountType = 'athlete' | 'professional';

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const PDF_MIME_TYPE = 'application/pdf';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    AuthVisual,
    AtlasBrand,
    AtlasIcon,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  name = '';
  email = '';
  password = '';
  accountType: AccountType = 'athlete';
  documentFile: File | null = null;
  showPassword = false;
  loading = false;
  error = '';
  documentError = '';

  submit(): void {
    if (this.loading) return;

    this.loading = true;
    this.error = '';
    this.documentError = '';

    const payload = {
      name: this.name.trim(),
      email: this.email.trim(),
      password: this.password,
    };

    if (this.accountType === 'professional') {
      if (!this.documentFile) {
        this.documentError = 'Envie um comprovante profissional em PDF.';
        this.loading = false;
        return;
      }

      this.auth
        .registerProfessional({ ...payload, document: this.documentFile })
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: () => this.router.navigateByUrl('/app/dashboard'),
          error: (err) => {
            this.error =
              err?.error?.error?.message ??
              'Não foi possível enviar seu cadastro profissional.';
          },
        });
      return;
    }

    this.auth
      .register(payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => this.router.navigateByUrl('/app/dashboard'),
        error: (err) => {
          this.error =
            err?.error?.error?.message ?? 'Não foi possível criar sua conta.';
        },
      });
  }

  selectAccountType(type: AccountType): void {
    this.accountType = type;
    this.error = '';

    if (type === 'athlete') {
      this.clearDocument();
    }
  }

  selectDocument(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0) ?? null;

    this.documentError = '';
    this.documentFile = null;

    if (!file) return;

    if (!this.isPdf(file)) {
      this.documentError = 'O comprovante precisa ser um arquivo PDF.';
      input.value = '';
      return;
    }

    if (file.size > MAX_DOCUMENT_BYTES) {
      this.documentError = 'O PDF deve ter no máximo 5 MB.';
      input.value = '';
      return;
    }

    this.documentFile = file;
  }

  clearDocument(): void {
    this.documentFile = null;
    this.documentError = '';
  }

  documentSizeLabel(file: File): string {
    if (file.size < 1024 * 1024) {
      return `${Math.max(1, Math.round(file.size / 1024))} KB`;
    }

    return `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  }

  submitLabel(): string {
    if (this.loading) {
      return this.accountType === 'professional'
        ? 'Enviando análise...'
        : 'Criando conta...';
    }

    return this.accountType === 'professional'
      ? 'Enviar cadastro profissional'
      : 'Criar conta';
  }

  private isPdf(file: File): boolean {
    return (
      file.type === PDF_MIME_TYPE &&
      file.name.trim().toLowerCase().endsWith('.pdf')
    );
  }
}
