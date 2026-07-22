import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ATLAS_ICON_NAMES,
  AtlasIcon,
  type AtlasIconName,
} from '../../ui/atlas-icon/atlas-icon';

type PlaceholderDataKey = 'title' | 'description' | 'icon';

const PLACEHOLDER_ICONS = new Set<AtlasIconName>(ATLAS_ICON_NAMES);

@Component({
  selector: 'app-feature-placeholder',
  standalone: true,
  imports: [RouterLink, AtlasIcon],
  templateUrl: './feature-placeholder.html',
  styleUrl: './feature-placeholder.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturePlaceholder {
  private readonly route = inject(ActivatedRoute);
  private readonly routeData = toSignal(this.route.data, {
    initialValue: this.route.snapshot.data,
  });

  readonly title = computed(() => this.readRouteData('title', 'Novo módulo Atlas'));
  readonly description = computed(() =>
    this.readRouteData(
      'description',
      'Estamos preparando esta experiência para a próxima etapa do Atlas Protocol.',
    ),
  );
  readonly icon = computed<AtlasIconName>(() => {
    const icon = this.readRouteData('icon', 'info') as AtlasIconName;

    return PLACEHOLDER_ICONS.has(icon) ? icon : 'info';
  });

  private readRouteData(key: PlaceholderDataKey, fallback: string): string {
    const value = this.routeData()[key];

    return typeof value === 'string' && value.trim() ? value : fallback;
  }
}
