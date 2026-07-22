import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';

@Component({
  selector: 'app-atlas-brand',
  standalone: true,
  templateUrl: './atlas-brand.html',
  styleUrl: './atlas-brand.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtlasBrand {
  readonly compact = input(false, { transform: booleanAttribute });
  readonly inverse = input(false, { transform: booleanAttribute });
}
