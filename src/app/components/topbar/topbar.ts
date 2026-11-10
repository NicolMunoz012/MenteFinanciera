import { Component, inject, Input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { VoiceService } from '../../services/voice.service';
import { ThemeToggle } from '../theme-toggle/theme-toggle';

@Component({
  selector: 'app-topbar',
  imports: [RouterLink, ThemeToggle],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
  // "title" es un input; sin esto queda también como atributo HTML y el navegador
  // muestra el tooltip nativo al pasar el mouse por la barra.
  host: { '[attr.title]': 'null' },
})
export class Topbar {
  @Input() title = '';

  readonly searchTerm = signal('');
  readonly voice = inject(VoiceService);

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  submitSearch(): void {
    const term = this.searchTerm().trim();
    if (term.length === 0) {
      return;
    }
    this.router.navigate(['/buscar'], { queryParams: { q: term } });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
