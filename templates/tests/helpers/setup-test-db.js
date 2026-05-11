// templates/tests/helpers/setup-test-db.js
// Copy a: Dev/tests/helpers/setupTestDb.js
//
// Inicializa la BD de test con migraciones aplicadas + triggers nativos.
// Usado por el setup global de vitest (vitest.config.js .setupFiles).
//
// Asume que la BD ya existe (creada por el container de CI o por el operador
// localmente). Solo aplica migraciones y triggers.

import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEV_ROOT = join(__dirname, '..', '..');

/**
 * Aplica migraciones up + triggers del DBMS configurado.
 * Idempotente: si ya están aplicadas, no-op.
 */
export async function setupTestDb() {
  const dbms = process.env.DB_DRIVER ?? 'postgres';
  console.log(`[setup-test-db] DBMS: ${dbms}`);
  console.log(`[setup-test-db] BD: ${process.env.DB_NAME} @ ${process.env.DB_HOST}:${process.env.DB_PORT}`);

  try {
    execSync('node scripts/migrate.js up', {
      cwd: DEV_ROOT,
      stdio: 'inherit',
      env: process.env,
    });
    execSync('node scripts/migrate.js triggers', {
      cwd: DEV_ROOT,
      stdio: 'inherit',
      env: process.env,
    });
  } catch (err) {
    console.error('[setup-test-db] FAILED');
    throw err;
  }
}

/**
 * Para usar en vitest globalSetup o setupFiles:
 *
 *   // vitest.config.js
 *   export default defineConfig({
 *     test: {
 *       globalSetup: ['./tests/helpers/setup-test-db.js'],
 *     }
 *   });
 */
export default async function () {
  await setupTestDb();
}
