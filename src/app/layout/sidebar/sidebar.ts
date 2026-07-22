import { Component, EventEmitter, Input, Output, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AtlasBrand } from '../../shared/ui/atlas-brand/atlas-brand';
import { AtlasIcon, AtlasIconName } from '../../shared/ui/atlas-icon/atlas-icon';

interface NavigationItem {
  label: string;
  route: string;
  icon: AtlasIconName;
  exact?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, AtlasBrand, AtlasIcon],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  host: {
    '[class.is-open]': 'open',
  },
})
export class Sidebar {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  @Input() open = false;
  @Output() readonly navigationClose = new EventEmitter<void>();

  readonly primaryItems: NavigationItem[] = [
    { label: 'Visão geral', route: '/app', icon: 'home', exact: true },
  ];

  readonly routineItems: NavigationItem[] = [
    { label: 'Protocolos', route: '/app/protocols', icon: 'flask' },
    { label: 'Acompanhamento', route: '/app/tracking', icon: 'activity' },
    { label: 'Check-ins', route: '/app/check-ins', icon: 'clipboard' },
  ];

  readonly userInitials = computed(() => {
    const name = this.auth.currentUser()?.name?.trim();
    if (!name) return 'AP';

    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  });

  readonly roleLabel = computed(() => {
    const labels = { athlete: 'Atleta', professional: 'Profissional', admin: 'Administrador' };
    return labels[this.auth.currentUser()?.role ?? 'athlete'];
  });

  close(): void {
    this.navigationClose.emit();
  }

  logout(): void {
    this.auth.logout();
    this.close();
    this.router.navigateByUrl('/login');
  }
}
