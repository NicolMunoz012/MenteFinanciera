// Genera src/environments/environment.ts a partir de las variables del archivo .env.
// Se ejecuta solo antes de `npm start`, `npm run build` y `npm test`.
// No usa librerías externas: lee el .env, lo convierte a un objeto y escribe un
// archivo TypeScript normal, que es lo que Angular entiende.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = join(root, '.env');
const output = join(root, 'src', 'environments', 'environment.ts');

/** Lee .env y devuelve un objeto { CLAVE: valor }. */
async function readEnv() {
  let raw;
  try {
    raw = await readFile(envFile, 'utf8');
  } catch {
    console.error('[env] No existe el archivo .env. Copia .env.example a .env y completa los valores.');
    process.exit(1);
  }

  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, '');
        return [key, value];
      }),
  );
}

const env = await readEnv();
const url = env.INSFORGE_URL ?? '';
const anonKey = env.INSFORGE_ANON_KEY ?? '';

if (!url || !anonKey) {
  console.error('[env] Faltan INSFORGE_URL o INSFORGE_ANON_KEY en el archivo .env.');
  process.exit(1);
}

await mkdir(dirname(output), { recursive: true });
await writeFile(
  output,
  `// Archivo generado por scripts/set-env.mjs. No se edita a mano ni se sube al repositorio.
export const environment = {
  insforgeUrl: ${JSON.stringify(url)},
  insforgeAnonKey: ${JSON.stringify(anonKey)},
};
`,
  'utf8',
);

console.log('[env] src/environments/environment.ts generado desde .env');
