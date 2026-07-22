import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AtlasIcon } from '../../shared/ui/atlas-icon/atlas-icon';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, AtlasIcon],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  readonly auth = inject(AuthService);

  readonly firstName = computed(() => {
    const name = this.auth.currentUser()?.name?.trim();
    return name?.split(/\s+/)[0] || 'bem-vindo';
  });

  readonly accountStatus = computed(() =>
    this.auth.currentUser()?.active === false ? 'Conta inativa' : 'Conta ativa',
  );
}
