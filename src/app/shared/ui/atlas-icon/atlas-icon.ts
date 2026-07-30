import {
  ChangeDetectionStrategy,
  Component,
  input,
  numberAttribute,
} from '@angular/core';

export const ATLAS_ICON_NAMES = [
  'home',
  'flask',
  'activity',
  'clipboard',
  'chart',
  'menu',
  'close',
  'logout',
  'bell',
  'arrow-right',
  'calendar',
  'check',
  'shield',
  'user',
  'chevron-down',
  'eye',
  'eye-off',
  'info',
  'clock',
] as const;

export type AtlasIconName = (typeof ATLAS_ICON_NAMES)[number];

@Component({
  selector: 'app-atlas-icon',
  standalone: true,
  templateUrl: './atlas-icon.html',
  styleUrl: './atlas-icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
  },
})
export class AtlasIcon {
  readonly name = input.required<AtlasIconName>();
  readonly size = input(20, { transform: numberAttribute });
}
