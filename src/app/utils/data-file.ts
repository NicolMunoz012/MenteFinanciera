import { signal } from '@angular/core';

/**
 * Sincroniza los datos de la app con el archivo data/db.json (vía server/api.mjs).
 *
 * - Al iniciar, el archivo se copia al localStorage: el archivo manda.
 * - Cada cambio que se guarda en el storage se escribe de inmediato en el archivo.
 * - Si el servidor no responde, se muestra un aviso y se reintenta hasta lograrlo.
 */

/**
 * Claves del formato anterior, cuando los datos eran globales. La app actual
 * guarda por usuario (`mf.user-<id>.*`); este módulo NO está conectado todavía
 * y debe adaptarse a ese esquema antes de activarlo.
 */
export const DATA_FILE_KEYS = [
  'mf.transactions',
  'mf.categories',
  'mf.goals',
  'mf.reminders',
  'mf.dismissedAlerts',
  'mf.users',
] as const;

const API_URL = '/api/data';
const RETRY_MS = 3000;
const REQUEST_TIMEOUT_MS = 5000;

const LOAD_ERROR =
  'No se pudo leer data/db.json. Ejecuta "npm run server" para levantar el servidor de datos; los cambios no se guardarán hasta entonces.';
const SAVE_ERROR = 'No se pudo guardar en data/db.json. Reintentando… (¿está corriendo "npm run server"?)';

/** Mensaje de error visible para el usuario, o null si todo está bien. */
export const dataFileError = signal<string | null>(null);

let fileLoaded = false; // Ya se leyó el archivo: a partir de aquí es seguro escribirlo
let pendingChanges = false; // Hay cambios en el storage que aún no están en el archivo
let saving = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

/** Copia el contenido de data/db.json al localStorage. Se ejecuta antes de que arranque la app. */
export async function loadDataFile(): Promise<void> {
  if (await readFileIntoStorage()) return;

  dataFileError.set(LOAD_ERROR);
  // No se escribe nada hasta leer el archivo, para no pisarlo con datos viejos del navegador.
  // Cuando el servidor responda, se recarga la página para mostrar los datos del archivo.
  scheduleRetry(async () => {
    if (await readFileIntoStorage()) {
      location.reload();
    } else {
      dataFileError.set(LOAD_ERROR);
      return false;
    }
    return true;
  });
}

/** Avisa que una clave cambió en el storage; si es una clave de datos, se escribe en el archivo. */
export function saveDataFile(key: string): void {
  if (!(DATA_FILE_KEYS as readonly string[]).includes(key)) return;
  pendingChanges = true;
  void flush();
}

/** Solo para tests: vuelve al estado inicial. */
export function resetDataFileForTests(): void {
  fileLoaded = false;
  pendingChanges = false;
  saving = false;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  dataFileError.set(null);
}

async function readFileIntoStorage(): Promise<boolean> {
  try {
    const response = await fetch(API_URL, { cache: 'no-store', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) return false;
    const data = (await response.json()) as Record<string, unknown>;

    for (const key of DATA_FILE_KEYS) {
      if (key in data) {
        localStorage.setItem(key, JSON.stringify(data[key]));
      } else {
        // El archivo no tiene esta clave: el servicio usará sus datos iniciales y los escribirá en el archivo
        localStorage.removeItem(key);
      }
    }

    fileLoaded = true;
    dataFileError.set(null);
    return true;
  } catch {
    return false;
  }
}

/** Envía el estado actual al archivo. Las escrituras van una tras otra; la última siempre gana. */
async function flush(): Promise<boolean> {
  if (!fileLoaded) return false;
  if (saving) return true; // La escritura en curso volverá a revisar los pendientes al terminar

  saving = true;
  try {
    while (pendingChanges) {
      pendingChanges = false;
      if (!(await putSnapshot())) {
        pendingChanges = true;
        dataFileError.set(SAVE_ERROR);
        scheduleRetry(flush);
        return false;
      }
    }
    dataFileError.set(null);
    return true;
  } finally {
    saving = false;
  }
}

async function putSnapshot(): Promise<boolean> {
  const snapshot: Record<string, unknown> = {};
  for (const key of DATA_FILE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw !== null) snapshot[key] = JSON.parse(raw);
  }

  try {
    const response = await fetch(API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Reintenta cada pocos segundos hasta que la tarea devuelva true. */
function scheduleRetry(task: () => Promise<boolean>): void {
  if (retryTimer) return;
  retryTimer = setTimeout(async () => {
    retryTimer = null;
    if (!(await task())) scheduleRetry(task);
  }, RETRY_MS);
}
