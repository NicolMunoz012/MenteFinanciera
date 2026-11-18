# MenteFinanciera

Aplicación de finanzas personales hecha con **Angular 22** y **InsForge** como
backend (PostgreSQL + autenticación + Row Level Security).

## Requisitos

- Node.js **24.15.0 o superior** (Angular 22 no arranca con versiones anteriores).
- npm.

## Configuración

1. Copia el archivo de ejemplo y completa tus datos:

   ```bash
   cp .env.example .env
   ```

   ```env
   INSFORGE_URL=https://dzc4jzq4.us-east.insforge.app
   INSFORGE_ANON_KEY=anon_...
   ```

2. Instala dependencias y arranca:

   ```bash
   npm install
   npm start
   ```

   `npm start` ejecuta antes `scripts/set-env.mjs`, que lee `.env` y genera
   `src/environments/environment.ts`. Ese archivo está en `.gitignore`: las
   claves no se suben al repositorio.

## Cuentas

Puedes registrar una cuenta nueva desde la pantalla **Regístrate**, o iniciar
sesión con el botón **Continuar con Google**. La verificación por correo está
desactivada para la demo.

### Inicio de sesión con Google

En el login hay un botón **Continuar con Google**. El flujo es corto:

1. `AuthService.loginWithGoogle()` llama a `insforge.auth.signInWithOAuth('google', ...)`
   y el SDK redirige a Google.
2. Google vuelve a `/dashboard` con un código en la URL.
3. El SDK lo detecta solo, crea la sesión y `getCurrentUser()` devuelve el
   usuario. Los guards esperan esa validación antes de dejar entrar.

## Cómo está conectado InsForge

```
Angular (navegador)
   │
   ├── AuthService ──────► insforge.auth
   │                        signUp / signInWithPassword / signOut
   │
   └── FinanceService ───► FinanceRepository ──► insforge.database
                              (select / insert / update / delete)
                                        │
                                        ▼
                              PostgreSQL + RLS
```

- **`src/app/core/insforge.ts`**: crea el cliente del SDK con la URL y la anon
  key que vienen de las variables de entorno.
- **`src/app/services/auth.service.ts`**: login, registro y cierre de sesión.
  El SDK guarda y refresca el token automáticamente.
- **`src/app/services/finance.repository.ts`**: único lugar que habla con las
  tablas. Traduce entre las filas de PostgreSQL (`due_date`) y los modelos de
  Angular (`dueDate`).
- **`src/app/services/finance.service.ts`**: mantiene el estado de la app con
  signals. Primero pinta la caché de `localStorage` y luego trae la verdad desde
  InsForge. Cada cambio se guarda en la base de datos en segundo plano.

## Modelo de datos

Cuatro tablas, todas con la misma idea: cada fila pertenece a un usuario y la
llave primaria es compuesta `(user_id, id)`. Así cada cuenta numera sus datos
1, 2, 3… sin chocar con las demás.

| Tabla | Columnas |
|---|---|
| `categories` | `user_id`, `id`, `name`, `budget` |
| `transactions` | `user_id`, `id`, `name`, `category`, `type`, `amount`, `date`, `source` |
| `goals` | `user_id`, `id`, `name`, `target`, `saved`, `due_date` |
| `reminders` | `user_id`, `id`, `name`, `amount`, `due_date`, `is_paid` |

**Seguridad (RLS):** cada tabla tiene Row Level Security activado y una política
que compara la fila con el usuario del token:

```sql
using (user_id = auth.uid())
with check (user_id = auth.uid())
```

Por eso el frontend nunca envía `user_id`: PostgreSQL lo llena con
`auth.uid()` y el usuario solo puede leer o modificar sus propias filas. Así se
comprobó: al iniciar sesión con Laura no se ven las filas de Carlos.

Las migraciones están en `migrations/` y se aplican con:

```bash
npx @insforge/cli db migrations up --all
```

## Flujo de datos

1. El usuario inicia sesión → InsForge devuelve su token.
2. `FinanceService` carga la caché local (para pintar rápido).
3. `FinanceRepository.loadAll()` consulta las 4 tablas; RLS filtra por usuario.
4. Si la cuenta es nueva, se crean solo las **categorías base**; empieza sin
   movimientos, metas ni recordatorios inventados.
5. Al crear, editar o borrar, el signal se actualiza al instante y el cambio se
   escribe en InsForge sin bloquear la interfaz.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | genera el entorno y arranca `ng serve` |
| `npm run build` | genera el entorno y compila para producción |
| `npm test` | genera el entorno y ejecuta los tests con Vitest |
| `npm run env` | solo regenera `src/environments/environment.ts` |

## Comandos útiles de InsForge

```bash
npx @insforge/cli current          # proyecto enlazado
npx @insforge/cli metadata         # tablas, auth y configuración
npx @insforge/cli db tables        # tablas creadas
npx @insforge/cli db policies      # políticas RLS
```

> La llave de administrador (`ik_...`) se guarda en `.insforge/project.json` y
> en `opencode.json`; ambos están en `.gitignore`.
