import { Component } from '@angular/core';

/** Panel izquierdo de marca compartido por las pantallas de Iniciar sesión y Crear cuenta. */
@Component({
  selector: 'app-auth-brand-panel',
  templateUrl: './auth-brand-panel.html',
  styleUrl: './auth-brand-panel.scss',
})
export class AuthBrandPanel {
  readonly year = new Date().getFullYear();
}
