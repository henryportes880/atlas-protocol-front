import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AtlasBrand } from '../../ui/atlas-brand/atlas-brand';

@Component({
  selector: 'app-auth-visual',
  standalone: true,
  imports: [AtlasBrand],
  templateUrl: './auth-visual.html',
  styleUrl: './auth-visual.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthVisual {}
