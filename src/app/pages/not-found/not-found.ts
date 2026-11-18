import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-not-found',
  imports: [CommonModule, RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {
  private readonly auth = inject(AuthService);

  readonly isLogged = computed(() => this.auth.currentUser() !== null);
  readonly homeRoute = computed(() => (this.isLogged() ? '/dashboard' : '/login'));
  readonly homeLabel = computed(() =>
    this.isLogged() ? 'Volver al dashboard' : 'Ir a iniciar sesión',
  );
}
