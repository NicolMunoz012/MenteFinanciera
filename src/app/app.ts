import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VoicePanel } from './components/voice-panel/voice-panel';
import { ThemeService } from './services/theme.service';
import { VoiceService } from './services/voice.service';

@Component({
  imports: [RouterOutlet, VoicePanel],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('menteFinanciera');

  // El panel de voz vive en la raíz para que el micrófono del topbar funcione
  // en cualquier ruta. El tema se aplica al arrancar, incluso antes del login.
  private readonly voice = inject(VoiceService);

  constructor() {
    inject(ThemeService);
  }

  readonly panelOpen = this.voice.panelOpen;
}
