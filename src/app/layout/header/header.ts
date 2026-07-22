import {
  Component,
  DestroyRef,
  EventEmitter,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { AtlasIcon } from '../../shared/ui/atlas-icon/atlas-icon';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [AtlasIcon],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  readonly auth = inject(AuthService);

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @Output()
  readonly menuToggle = new EventEmitter<void>();

  readonly pageTitle = signal('Visão geral');
  readonly pageEyebrow = signal('Painel Atlas');
  readonly breadcrumb = signal('Início');

  readonly userInitials = computed(() => {
    const name = this.auth.currentUser()?.name?.trim();

    if (!name) {
      return 'AP';
    }

    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  });

  readonly roleLabel = computed(() => {
    const role = this.auth.currentUser()?.role;

    const labels: Record<string, string> = {
      athlete: 'Atleta',
      professional: 'Profissional',
      admin: 'Administrador',
    };

    return role ? (labels[role] ?? 'Usuário') : 'Usuário';
  });

  constructor() {
    /*
     * Não chamamos updateRouteContext() imediatamente aqui.
     *
     * O Header pode ser criado antes de o Angular terminar
     * de montar toda a árvore de rotas.
     */
    queueMicrotask(() => {
      this.updateRouteContext();
    });

    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd =>
            event instanceof NavigationEnd,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.updateRouteContext();
      });
  }

  private updateRouteContext(): void {
    /*
     * Pegamos a árvore de rotas já resolvida pelo Router,
     * em vez de depender do ActivatedRoute do Header.
     */
    let route = this.router.routerState.snapshot.root;

    while (route.firstChild) {
      route = route.firstChild;
    }

    const data = route.data ?? {};

    this.pageTitle.set(
      typeof data['title'] === 'string'
        ? data['title']
        : 'Visão geral',
    );

    this.pageEyebrow.set(
      typeof data['eyebrow'] === 'string'
        ? data['eyebrow']
        : 'Painel Atlas',
    );

    this.breadcrumb.set(
      typeof data['breadcrumb'] === 'string'
        ? data['breadcrumb']
        : 'Início',
    );
  }
}