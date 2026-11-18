import { Injectable } from '@angular/core';
import { createClient } from '@insforge/sdk';
import { environment } from '../../environments/environment';

/**
 * Conexión con el backend InsForge.
 *
 * La URL y la anon key se leen de variables de entorno (archivo .env), no del
 * código. `scripts/set-env.mjs` genera `src/environments/environment.ts` antes
 * de arrancar o compilar la app.
 *
 * La anon key es pública: solo permite lo que las políticas RLS autoricen para
 * el usuario logueado. La llave de administrador (ik_...) nunca va al frontend.
 *
 * Se expone como servicio de Angular para que los tests puedan reemplazarlo
 * por un cliente falso con TestBed.
 */
@Injectable({ providedIn: 'root' })
export class InsforgeClient {
  readonly client = createClient({
    baseUrl: environment.insforgeUrl,
    anonKey: environment.insforgeAnonKey,
  });
}

