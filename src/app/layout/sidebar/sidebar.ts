import { Component, EventEmitter, Input, Output, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { UserRole } from '../../core/models/auth.model';
import { AuthService } from '../../core/services/auth.service';
import { AtlasBrand } from '../../shared/ui/atlas-brand/atlas-brand';
import { AtlasIcon, AtlasIconName } from '../../shared/ui/atlas-icon/atlas-icon';

interface NavigationItem {
  label: string;
  route: string;
  icon: AtlasIconName;
  exact?: boolean;
  roles?: UserRole[];
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
    { label: 'Visão geral', route: '/app/dashboard', icon: 'home', exact: true },
  ];

  readonly routineItems: NavigationItem[] = [
    { label: 'Vínculos', route: '/app/links', icon: 'user' },
    { label: 'Protocolos', route: '/app/protocols', icon: 'flask' },
    { label: 'Tracking', route: '/app/tracking', icon: 'activity' },
    { label: 'Check-ins', route: '/app/check-ins', icon: 'clipboard' },
    { label: 'Exames', route: '/app/exams', icon: 'flask' },
    { label: 'Evolução física', route: '/app/progress', icon: 'chart' },
    { label: 'Timeline', route: '/app/timeline', icon: 'clock' },
    { label: 'Inventário', route: '/app/inventory', icon: 'info' },
    { label: 'Notificações', route: '/app/notifications', icon: 'bell' },
  ];

  readonly adminItems: NavigationItem[] = [
    {
      label: 'Administração',
      route: '/app/admin',
      icon: 'shield',
      roles: ['admin'],
    },
  ];

  readonly visiblePrimaryItems = computed(() => this.visibleItems(this.primaryItems));
  readonly visibleRoutineItems = computed(() => this.visibleItems(this.routineItems));
  readonly visibleAdminItems = computed(() => this.visibleItems(this.adminItems));

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
    const labels = {
      athlete: 'Atleta',
      professional: 'Profissional',
      admin: 'Administrador',
    };
    const role = this.auth.currentUser()?.role;
    return role ? labels[role] : 'Usuário';
  });

  close(): void {
    this.navigationClose.emit();
  }

  logout(): void {
    this.auth.logout();
    this.close();
    this.router.navigateByUrl('/login');
  }

  private visibleItems(items: NavigationItem[]): NavigationItem[] {
    const role = this.auth.currentUser()?.role;
    return items.filter((item) => !item.roles || (role && item.roles.includes(role)));
  }
}
