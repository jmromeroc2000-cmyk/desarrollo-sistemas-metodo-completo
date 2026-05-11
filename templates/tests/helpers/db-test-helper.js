// templates/tests/helpers/db-test-helper.js
// Copy a: Dev/tests/helpers/dbTestHelper.js
//
// Helpers de test portables a los 6 DBMS via db-adapter.
//
// Uso típico en tests:
//
//   import { withTestClient, bypassTriggers, cleanTables } from './helpers/dbTestHelper.js';
//
//   describe('mi feature', () => {
//     beforeEach(async () => {
//       await cleanTables('detalles', 'cabezas');
//     });
//
//     it('inserta y recupera', async () => {
//       await withTestClient(async (client) => {
//         // ... operaciones de test ...
//       });
//     });
//   });

import adapter from '../../db-adapters/index.js';

let _pool;

function getPool() {
  if (!_pool) {
    _pool = adapter.createPool(loadDbConfig());
  }
  return _pool;
}

function loadDbConfig() {
  return {
    host:        process.env.DB_HOST,
    port:        process.env.DB_PORT,
    database:    process.env.DB_NAME,
    user:        process.env.DB_USER,
    password:    process.env.DB_PASSWORD,
    serviceName: process.env.DB_SERVICE_NAME,
    projectId:   process.env.GCP_PROJECT,
    instance:    process.env.SPANNER_INSTANCE,
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
    max:         5,                   // pool pequeño para tests
  };
}

// ─────────────────────────────────────────────────────────────────
// Acquire / release uniforme
// ─────────────────────────────────────────────────────────────────

export async function acquireClient() {
  const pool = getPool();
  switch (adapter.dbms) {
    case 'postgres': return await pool.connect();
    case 'mysql':    return await pool.getConnection();
    case 'sqlserver': await pool.connect(); return pool;
    case 'oracle':   return await pool.getConnection();
    case 'db2':      return await new Promise((res, rej) =>
                       pool.open((err, db) => err ? rej(err) : res(db)));
    case 'spanner':  return pool;
  }
}

export async function releaseClient(client) {
  switch (adapter.dbms) {
    case 'postgres': client.release(); break;
    case 'mysql':    client.release(); break;
    case 'sqlserver': /* no release per request */ break;
    case 'oracle':   await client.close(); break;
    case 'db2':      await new Promise((res) => client.close(res)); break;
    case 'spanner':  /* no release */ break;
  }
}

/**
 * Higher-order helper que adquiere cliente, ejecuta callback, libera siempre.
 *
 *   await withTestClient(async (client) => {
 *     await runQuery(client, 'INSERT INTO ...');
 *   });
 */
export async function withTestClient(fn) {
  const client = await acquireClient();
  try {
    return await fn(client);
  } finally {
    await releaseClient(client);
  }
}

// ─────────────────────────────────────────────────────────────────
// Query helpers uniformes (mismos que el migration runner, exportados
// aquí para que los tests no dupliquen la lógica de wrapping de drivers)
// ─────────────────────────────────────────────────────────────────

export async function runQuery(client, sql, params) {
  switch (adapter.dbms) {
    case 'postgres':
      return await client.query(sql, params);
    case 'mysql':
      return await client.query(sql, params);
    case 'sqlserver': {
      const req = client.request();
      (params ?? []).forEach((p, i) => req.input(`p${i}`, p));
      return await req.query(sql);
    }
    case 'oracle':
      return await client.execute(sql, params ?? [], { autoCommit: true });
    case 'db2':
      return await new Promise((res, rej) =>
        client.query(sql, params ?? [], (err, rows) =>
          err ? rej(err) : res({ rows: rows ?? [] })));
    case 'spanner':
      return await client.run({ sql, params });
  }
}

export async function runQueryRows(client, sql, params) {
  const r = await runQuery(client, sql, params);
  switch (adapter.dbms) {
    case 'postgres':  return r.rows;
    case 'mysql':     return Array.isArray(r) ? r[0] : r;
    case 'sqlserver': return r.recordset ?? [];
    case 'oracle':    return r.rows ?? [];
    case 'db2':       return r.rows ?? [];
    case 'spanner': {
      const [rows] = r;
      return rows.map((row) => row.toJSON());
    }
  }
}

export async function runQueryScalar(client, sql, params) {
  const rows = await runQueryRows(client, sql, params);
  if (rows.length === 0) return null;
  const row = rows[0];
  const keys = Object.keys(row);
  return keys.length > 0 ? row[keys[0]] : null;
}

// ─────────────────────────────────────────────────────────────────
// Bypass de triggers — delega al adapter
// ─────────────────────────────────────────────────────────────────

/**
 * Ejecuta callback con triggers de protección de metadata bypasseados.
 * En tests, útil para insertar datos directamente a tablas protegidas
 * (tablas_sistema, campos_sistema) sin pasar por el migration runner.
 *
 * Cada adapter tiene su mecanismo (session_replication_role, DISABLE TRIGGER,
 * SESSION_CONTEXT, etc.). Spanner: no-op.
 *
 *   await bypassTriggers(client, async () => {
 *     await runQuery(client, 'DELETE FROM variables_historia WHERE clave=?', [...]);
 *   });
 */
export async function bypassTriggers(client, fn) {
  return await adapter.bypassTriggers(client, fn);
}

// ─────────────────────────────────────────────────────────────────
// Cleanup de tablas — portable
// ─────────────────────────────────────────────────────────────────

/**
 * Borra TODAS las filas de las tablas listadas, en el ORDEN dado (el caller
 * debe respetar las FKs: tablas hijas primero, padres después).
 *
 * Sintaxis varía por DBMS:
 *   - PostgreSQL/MySQL/SQL Server: TRUNCATE TABLE (rápido, no respeta FKs)
 *   - Oracle/DB2:                  TRUNCATE TABLE (idem)
 *   - Spanner:                     DELETE FROM (no soporta TRUNCATE)
 *
 * Para metadata bypasseamos triggers; para tablas de dominio simples no.
 *
 *   await cleanTables('detalles', 'cabezas');
 */
export async function cleanTables(...tables) {
  const client = await acquireClient();
  try {
    for (const table of tables) {
      const qt = adapter.quote(table);
      switch (adapter.dbms) {
        case 'postgres':
        case 'mysql':
          // TRUNCATE no respeta FKs en MySQL si InnoDB con FOREIGN_KEY_CHECKS.
          // Usar DELETE para máxima compatibilidad.
          await runQuery(client, `DELETE FROM ${qt}`);
          break;
        case 'sqlserver':
          await runQuery(client, `DELETE FROM ${qt}`);
          break;
        case 'oracle':
        case 'db2':
          await runQuery(client, `DELETE FROM ${qt}`);
          break;
        case 'spanner':
          // Spanner DELETE requiere WHERE; usamos WHERE true
          await runQuery(client, `DELETE FROM ${qt} WHERE true`);
          break;
      }
    }
  } finally {
    await releaseClient(client);
  }
}

/**
 * Limpia tabla con bypass de triggers (necesario para tablas protegidas
 * como variables_historia que tienen trigger anti-DELETE).
 */
export async function cleanProtectedTables(...tables) {
  const client = await acquireClient();
  try {
    await bypassTriggers(client, async () => {
      for (const table of tables) {
        const qt = adapter.quote(table);
        if (adapter.dbms === 'spanner') {
          await runQuery(client, `DELETE FROM ${qt} WHERE true`);
        } else {
          await runQuery(client, `DELETE FROM ${qt}`);
        }
      }
    });
  } finally {
    await releaseClient(client);
  }
}

// ─────────────────────────────────────────────────────────────────
// Counting helpers — patrón canónico de tests order-independent
// ─────────────────────────────────────────────────────────────────

/**
 * Count rows. Patrón canónico para tests que verifican "se insertó/borró N
 * filas" sin depender de timestamps (que sufren μs vs ms entre DBMS).
 *
 *   const before = await countRows('mi_tabla');
 *   await accion();
 *   const after = await countRows('mi_tabla');
 *   expect(after - before).toBe(1);
 */
export async function countRows(table, whereClause = '', params = []) {
  const client = await acquireClient();
  try {
    const where = whereClause ? `WHERE ${whereClause}` : '';
    const sql = `SELECT COUNT(*) AS n FROM ${adapter.quote(table)} ${where}`;
    const n = await runQueryScalar(client, sql, params);
    return Number(n);
  } finally {
    await releaseClient(client);
  }
}

// ─────────────────────────────────────────────────────────────────
// Cerrar pool (afterAll)
// ─────────────────────────────────────────────────────────────────

export async function closePool() {
  if (!_pool) return;
  switch (adapter.dbms) {
    case 'postgres':  await _pool.end(); break;
    case 'mysql':     await _pool.end(); break;
    case 'sqlserver': await _pool.close(); break;
    case 'oracle':    await _pool.close(); break;
    case 'db2':       _pool.close(); break;
    case 'spanner':   /* nothing */ break;
  }
  _pool = null;
}

// Re-exportar adapter por conveniencia
export { adapter };
