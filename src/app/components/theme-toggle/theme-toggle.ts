import { Component, inject } from '@angular/core';
import { ThemeService } from '../../services/theme.service';

/** Botón reutilizable para alternar entre el tema oscuro y el claro. */
@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.scss',
})
export class ThemeToggle {
  readonly theme = inject(ThemeService);
}
