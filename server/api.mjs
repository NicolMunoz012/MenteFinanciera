// Servidor local mínimo que guarda los datos de la app en data/db.json.
// Sin librerías: solo módulos de Node. Se levanta con `npm run server`.
import { createServer } from 'node:http';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = '127.0.0.1';
const PORT = 3210;
const DB_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'db.json');
const MAX_BODY_BYTES = 5 * 1024 * 1024;

async function readDb() {
  try {
    return await readFile(DB_FILE, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return '{}'; // Primer arranque: todavía no hay archivo
    throw error;
  }
}

// Escribe primero un archivo temporal y luego lo renombra: db.json nunca queda a medio escribir.
async function writeDb(data) {
  await mkdir(dirname(DB_FILE), { recursive: true });
  const tmpFile = `${DB_FILE}.tmp`;
  await writeFile(tmpFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(tmpFile, DB_FILE);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Cuerpo demasiado grande'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  try {
    if (req.url !== '/api/data') {
      res.writeHead(404).end();
      return;
    }

    if (req.method === 'GET') {
      res
        .writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
        .end(await readDb());
      return;
    }

    if (req.method === 'PUT') {
      let data;
      try {
        data = JSON.parse(await readBody(req));
      } catch {
        res.writeHead(400).end();
        return;
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        res.writeHead(400).end();
        return;
      }
      await writeDb(data);
      res.writeHead(204).end();
      return;
    }

    res.writeHead(405, { Allow: 'GET, PUT' }).end();
  } catch (error) {
    console.error('[api] Error:', error);
    res.writeHead(500).end();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[api] Datos en ${DB_FILE} → http://${HOST}:${PORT}/api/data`);
});
