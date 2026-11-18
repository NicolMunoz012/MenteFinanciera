
// Genera src/environments/environment.ts a partir de las variables
// de entorno de Vercel o, en desarrollo local, del archivo .env.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = join(root, '.env');
const output = join(root, 'src', 'environments', 'environment.ts');

// Lee el archivo .env si existe.
// En Vercel no es obligatorio porque utiliza process.env.
async function readLocalEnv() {
  try {
    const raw = await readFile(envFile, 'utf8');

    return Object.fromEntries(
      raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'))
        .filter((line) => line.includes('='))
        .map((line) => {
          const separator = line.indexOf('=');
          const key = line.slice(0, separator).trim();
          const value = line
            .slice(separator + 1)
            .trim()
            .replace(/^["']|["']$/g, '');

          return [key, value];
        }),
    );
  } catch {
    console.log('[env] No se encontró .env. Usando variables del sistema.');
    return {};
  }
}

const localEnv = await readLocalEnv();

// Las variables del sistema (Vercel) tienen prioridad sobre .env.
const url = process.env.INSFORGE_URL || localEnv.INSFORGE_URL || '';
const anonKey =
  process.env.INSFORGE_ANON_KEY || localEnv.INSFORGE_ANON_KEY || '';

if (!url || !anonKey) {
  console.error('[env] ERROR: Faltan variables de entorno.');
  console.error(
    '[env] Verifica INSFORGE_URL e INSFORGE_ANON_KEY en Vercel o en tu archivo .env.',
  );
  process.exit(1);
}

await mkdir(dirname(output), { recursive: true });

await writeFile(
  output,
  `// Archivo generado por scripts/set-env.mjs.
export const environment = {
  insforgeUrl: ${JSON.stringify(url)},
  insforgeAnonKey: ${JSON.stringify(anonKey)},
};
`,
  'utf8',
);

console.log('[env] src/environments/environment.ts generado correctamente.');
