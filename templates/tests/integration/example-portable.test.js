// templates/tests/integration/example-portable.test.js
// Ejemplo canónico de test de integración multi-DBMS.
// Demuestra los patrones que TODOS los tests del método deben seguir
// para correr en los 6 DBMS sin modificación.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  withTestClient,
  runQuery,
  runQueryRows,
  countRows,
  cleanTables,
  bypassTriggers,
  closePool,
  adapter,
} from '../helpers/db-test-helper.js';

describe(`ejemplo portable [${adapter.dbms}]`, () => {

  beforeAll(async () => {
    // setup-test-db.js ya corrió en globalSetup; las migraciones están
    // aplicadas. Aquí solo limpiamos las tablas del feature bajo test.
  });

  afterAll(async () => {
    await closePool();
  });

  beforeEach(async () => {
    // PORTABLE: usa DELETE (no TRUNCATE). Respeta orden de FKs.
    await cleanTables('mi_tabla_detalle', 'mi_tabla');
  });

  // ───────────────────────────────────────────────────────────────
  // PATRÓN 1 — INSERT + verificar con count
  // ───────────────────────────────────────────────────────────────

  it('inserta una fila', async () => {
    const id = '00000000-0000-0000-0000-000000000001';

    // Conteo ANTES
    const before = await countRows('mi_tabla');

    // Acción
    await withTestClient(async (client) => {
      await runQuery(client,
        // SQL portable: sin RETURNING (PG-only), sin AUTO_INCREMENT
        adapter.dbms === 'postgres' || adapter.dbms === 'oracle' || adapter.dbms === 'db2'
          ? `INSERT INTO mi_tabla (id, nombre, activo, creado_en) VALUES ($1, $2, $3, $4)`
          : adapter.dbms === 'sqlserver'
          ? `INSERT INTO mi_tabla (id, nombre, activo, creado_en) VALUES (@p0, @p1, @p2, @p3)`
          : `INSERT INTO mi_tabla (id, nombre, activo, creado_en) VALUES (?, ?, ?, ?)`,
        [id, 'Test', 1, new Date().toISOString()],
      );
    });

    // Conteo DESPUÉS
    const after = await countRows('mi_tabla');
    expect(after - before).toBe(1);
  });

  // ───────────────────────────────────────────────────────────────
  // PATRÓN 2 — SELECT con clave conocida
  // ───────────────────────────────────────────────────────────────

  it('recupera por id', async () => {
    const id = '00000000-0000-0000-0000-000000000002';
    await withTestClient(async (client) => {
      // Setup
      await runQuery(client,
        `INSERT INTO mi_tabla (id, nombre, activo, creado_en) VALUES (${ph(1)}, ${ph(2)}, ${ph(3)}, ${ph(4)})`,
        [id, 'Otro', 1, new Date().toISOString()],
      );

      // Acción
      const rows = await runQueryRows(client,
        `SELECT id, nombre, activo FROM mi_tabla WHERE id = ${ph(1)}`,
        [id],
      );

      // Verificación
      expect(rows).toHaveLength(1);
      // El driver puede devolver nombres en minúsculas (mysql) o mayúsculas (oracle/db2);
      // normalizar antes de assert.
      const row = normalizeRow(rows[0]);
      expect(row.nombre).toBe('Otro');
      // BOOLEANO_01 portable: siempre llega como number 0|1
      expect([0, 1]).toContain(row.activo);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // PATRÓN 3 — verificar inserción a tabla de bitácora (insert-only)
  // ───────────────────────────────────────────────────────────────

  it('escribe en audit log y NO permite borrar', async () => {
    const id = '00000000-0000-0000-0000-000000000003';

    // Acción: service inserta a la tabla audit
    await withTestClient(async (client) => {
      await runQuery(client,
        `INSERT INTO mi_tabla_audit (id, evento, ocurrido_en) VALUES (${ph(1)}, ${ph(2)}, ${ph(3)})`,
        [id, 'CREADO', new Date().toISOString()],
      );
    });

    // Verificar que se insertó
    const count = await countRows('mi_tabla_audit', `id = ${ph(1)}`, [id]);
    expect(count).toBe(1);

    // Verificar que NO se puede borrar sin bypass (los triggers Capa 2 bloquean)
    // En Spanner no hay triggers — el test no aplica, lo skipeamos.
    if (adapter.dbms === 'spanner') return;

    let blocked = false;
    try {
      await withTestClient(async (client) => {
        await runQuery(client,
          `DELETE FROM mi_tabla_audit WHERE id = ${ph(1)}`,
          [id],
        );
      });
    } catch (err) {
      blocked = true;
      // Verificar mensaje específico del trigger
      expect(err.message).toMatch(/bitácora|inmutable|audit|UPDATE ni DELETE/i);
    }
    expect(blocked).toBe(true);
  });

  // ───────────────────────────────────────────────────────────────
  // PATRÓN 4 — bypass de triggers para cleanup en test
  // ───────────────────────────────────────────────────────────────

  it('bypass de triggers permite limpiar audit (solo tests)', async () => {
    if (adapter.dbms === 'spanner') return; // no aplica

    const id = '00000000-0000-0000-0000-000000000004';

    // Setup: insertar en audit
    await withTestClient(async (client) => {
      await runQuery(client,
        `INSERT INTO mi_tabla_audit (id, evento, ocurrido_en) VALUES (${ph(1)}, ${ph(2)}, ${ph(3)})`,
        [id, 'TEST', new Date().toISOString()],
      );
    });

    // Cleanup con bypass: triggers permiten DELETE solo durante el bypass
    await withTestClient(async (client) => {
      await bypassTriggers(client, async () => {
        await runQuery(client,
          `DELETE FROM mi_tabla_audit WHERE id = ${ph(1)}`,
          [id],
        );
      });
    });

    const count = await countRows('mi_tabla_audit', `id = ${ph(1)}`, [id]);
    expect(count).toBe(0);
  });

  // ───────────────────────────────────────────────────────────────
  // PATRÓN 5 — no comparar timestamps con > (μs vs ms problem)
  // ───────────────────────────────────────────────────────────────

  it('no compara timestamps con >; usa count-before/after', async () => {
    const before = await countRows('mi_tabla_audit');

    // Acción que escribe a audit
    await withTestClient(async (client) => {
      await runQuery(client,
        `INSERT INTO mi_tabla_audit (id, evento, ocurrido_en) VALUES (${ph(1)}, ${ph(2)}, ${ph(3)})`,
        ['00000000-0000-0000-0000-000000000005', 'TIMESTAMP_TEST', new Date().toISOString()],
      );
    });

    const after = await countRows('mi_tabla_audit');

    // VERIFICACIÓN PORTABLE: diferencia de conteos, no comparación de ts.
    // Este patrón evita el bug "μs en PG vs ms en JS Date" que documentamos
    // en memory/timestamp-precision-cross-dbms.md
    expect(after - before).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────
// Helpers de placeholders portables
// ─────────────────────────────────────────────────────────────────

/**
 * Placeholder portable para SQL parametrizado.
 *
 *   pg/oracle/db2:    $1, $2  ... (postgres) o :1, :2 (oracle/db2 — node-pg
 *                                                       y node-oracledb)
 *   mysql:            ?, ? (positional)
 *   sqlserver:        @p0, @p1 (named)
 *   spanner:          @p0, @p1 (named)
 *
 * Para máxima portabilidad sin tener que rotar sintaxis a mano, el helper
 * runQuery() del db-test-helper.js abstrae esto. Pero para SQL inline en
 * el test, ph(n) devuelve el placeholder correcto según el adapter activo.
 */
function ph(n) {
  switch (adapter.dbms) {
    case 'postgres':  return `$${n}`;
    case 'mysql':     return `?`;
    case 'sqlserver': return `@p${n - 1}`;
    case 'oracle':
    case 'db2':       return `:${n}`;
    case 'spanner':   return `@p${n - 1}`;
  }
}

/**
 * Normaliza nombres de columna a lowercase. Oracle y DB2 devuelven uppercase
 * por default (a menos que las identificadores hayan sido quoted en CREATE).
 * MySQL preserva el case original. PostgreSQL/SQL Server lowercase si no
 * fueron quoted.
 *
 * Tests defensivos: aplicar normalizeRow() antes de assert por nombre de
 * columna para evitar fallas por case mismatch.
 */
function normalizeRow(row) {
  const out = {};
  for (const k of Object.keys(row)) {
    out[k.toLowerCase()] = row[k];
  }
  return out;
}
