#!/usr/bin/env node
// templates/migrate.js
// Copy a: Dev/scripts/migrate.js (o donde el proyecto lo coloque).
//
// Migration runner multi-DBMS — v3.0.0
//
// Detecta el DBMS via env DB_DRIVER (postgres|mysql|sqlserver|oracle|db2|spanner).
// Carga el adapter correspondiente desde templates/db-adapters/<dbms>/.
//
// Comandos:
//   node scripts/migrate.js up        # aplica todas las migraciones pendientes
//   node scripts/migrate.js up 5      # aplica hasta migración 5 inclusive
//   node scripts/migrate.js down 3    # revierte hasta dejar #3 aplicada
//   node scripts/migrate.js status    # lista aplicadas/pendientes
//   node scripts/migrate.js triggers  # re-aplica triggers nativos del DBMS
//
// Convención de archivos:
//   migrations/NNNN_descripcion.up.sql    — aplicar (obligatorio)
//   migrations/NNNN_descripcion.down.sql  — revertir (obligatorio salvo no-reversible)
//
// SQL strict mode:
//   - Migraciones son SQL-92 portable, SIN BEGIN/COMMIT explícitos.
//   - El runner abre/cierra transacciones via adapter.
//   - El runner activa bypass de triggers metadata via adapter.beginMetadataChange()
//     antes de cada migración (session-scoped, se limpia al cerrar conexión).
//
// Spanner:
//   Tiene API client distinta (transactions explícitas, no SQL strings),
//   se delega a un código specializado al detectar adapter.dbms === 'spanner'.

import 'dotenv/config';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import adapter from '../db-adapters/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

// ─────────────────────────────────────────────────────────────────
// Discovery de archivos
// ─────────────────────────────────────────────────────────────────

function listMigrationFiles() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.up.sql') || f.endsWith('.down.sql'));

  const byNumber = new Map(); // num -> {num, name, up, down}
  for (const f of files) {
    const m = f.match(/^(\d{4})_([^.]+)\.(up|down)\.sql$/);
    if (!m) continue;
    const [, numStr, name, dir] = m;
    const num = parseInt(numStr, 10);
    const entry = byNumber.get(num) ?? { num, name, up: null, down: null };
    entry[dir] = f;
    byNumber.set(num, entry);
  }

  // Validar: cada migración tiene su .up; .down es recomendado pero no obligatorio
  // (algunas migraciones no son reversibles — deben tener .down.sql con
  //  RAISE EXCEPTION explicando por qué).
  const ordered = [...byNumber.values()].sort((a, b) => a.num - b.num);
  for (const m of ordered) {
    if (!m.up) {
      throw new Error(`Migración ${m.num} (${m.name}): falta archivo .up.sql`);
    }
    if (!m.down) {
      console.warn(`⚠️  Migración ${m.num} (${m.name}): sin .down.sql (no reversible)`);
    }
  }
  return ordered;
}

// ─────────────────────────────────────────────────────────────────
// Tabla _migrations — registro de aplicadas
// ─────────────────────────────────────────────────────────────────

async function ensureMigrationsTable(client) {
  // SQL-92 portable: CREATE TABLE con columnas básicas.
  // En PostgreSQL/MySQL: usar IF NOT EXISTS.
  // En SQL Server: usar IF NOT EXISTS via OBJECT_ID.
  // En Oracle: usar BEGIN/EXCEPTION pattern.
  // En DB2: idem Oracle.
  switch (adapter.dbms) {
    case 'postgres':
    case 'mysql':
      await runQuery(client, `
        CREATE TABLE IF NOT EXISTS _migrations (
          num         INTEGER       NOT NULL,
          name        VARCHAR(200)  NOT NULL,
          aplicada_en VARCHAR(40)   NOT NULL,
          checksum    VARCHAR(64),
          CONSTRAINT pk__migrations PRIMARY KEY (num)
        )
      `);
      break;
    case 'sqlserver':
      await runQuery(client, `
        IF OBJECT_ID('dbo._migrations', 'U') IS NULL
        CREATE TABLE _migrations (
          num         INTEGER       NOT NULL PRIMARY KEY,
          name        VARCHAR(200)  NOT NULL,
          aplicada_en VARCHAR(40)   NOT NULL,
          checksum    VARCHAR(64)
        )
      `);
      break;
    case 'oracle':
    case 'db2':
      // Oracle/DB2: usar bloque PL/SQL o SQL-PL que verifica existencia
      try {
        await runQuery(client, `
          CREATE TABLE _migrations (
            num         INTEGER       NOT NULL PRIMARY KEY,
            name        VARCHAR(200)  NOT NULL,
            aplicada_en VARCHAR(40)   NOT NULL,
            checksum    VARCHAR(64)
          )
        `);
      } catch (err) {
        // Si ya existe, ignorar (ORA-00955 / SQL0601N)
        if (!/already exists|ORA-00955|SQL0601N/i.test(err.message)) throw err;
      }
      break;
    case 'spanner':
      // Spanner usa DDL via database.updateSchema() asíncrono
      try {
        await spannerUpdateSchema(client, [`
          CREATE TABLE _migrations (
            num         INT64         NOT NULL,
            name        STRING(200)   NOT NULL,
            aplicada_en STRING(40)    NOT NULL,
            checksum    STRING(64),
          ) PRIMARY KEY (num)
        `]);
      } catch (err) {
        if (!/Duplicate name/i.test(err.message)) throw err;
      }
      break;
  }
}

async function getApplied(client) {
  const rows = await runQueryRows(client, `SELECT num FROM _migrations ORDER BY num`);
  return new Set(rows.map((r) => Number(r.num ?? r.NUM)));
}

async function recordApplied(client, mig) {
  const aplicadaEn = new Date().toISOString();
  switch (adapter.dbms) {
    case 'postgres':
      await runQuery(client,
        `INSERT INTO _migrations (num, name, aplicada_en) VALUES ($1, $2, $3)`,
        [mig.num, mig.name, aplicadaEn],
      );
      break;
    case 'mysql':
      await runQuery(client,
        `INSERT INTO _migrations (num, name, aplicada_en) VALUES (?, ?, ?)`,
        [mig.num, mig.name, aplicadaEn],
      );
      break;
    case 'sqlserver':
      // mssql usa @namedParams
      await client.request()
        .input('num', mig.num)
        .input('name', mig.name)
        .input('aplicada', aplicadaEn)
        .query(`INSERT INTO _migrations (num, name, aplicada_en) VALUES (@num, @name, @aplicada)`);
      break;
    case 'oracle':
    case 'db2':
      await runQuery(client,
        `INSERT INTO _migrations (num, name, aplicada_en) VALUES (:1, :2, :3)`,
        [mig.num, mig.name, aplicadaEn],
      );
      break;
    case 'spanner':
      await spannerInsert(client, '_migrations', { num: mig.num, name: mig.name, aplicada_en: aplicadaEn });
      break;
  }
}

async function removeApplied(client, num) {
  switch (adapter.dbms) {
    case 'postgres':
      await runQuery(client, `DELETE FROM _migrations WHERE num = $1`, [num]); break;
    case 'mysql':
      await runQuery(client, `DELETE FROM _migrations WHERE num = ?`, [num]); break;
    case 'sqlserver':
      await client.request().input('num', num).query(`DELETE FROM _migrations WHERE num = @num`); break;
    case 'oracle':
    case 'db2':
      await runQuery(client, `DELETE FROM _migrations WHERE num = :1`, [num]); break;
    case 'spanner':
      await spannerDelete(client, '_migrations', { num }); break;
  }
}

// ─────────────────────────────────────────────────────────────────
// Helpers de query (uniformizan APIs distintas de los drivers)
// ─────────────────────────────────────────────────────────────────

async function runQuery(client, sql, params) {
  switch (adapter.dbms) {
    case 'postgres':
      await client.query(sql, params); break;
    case 'mysql':
      await client.query(sql, params); break;
    case 'sqlserver': {
      const req = client.request();
      (params ?? []).forEach((p, i) => req.input(`p${i}`, p));
      await req.query(sql.replace(/@(\w+)/g, (_, n) => `@${n}`));
      break;
    }
    case 'oracle':
      await client.execute(sql, params ?? []);
      await client.commit();
      break;
    case 'db2':
      await client.query(sql, params ?? []);
      break;
    case 'spanner':
      throw new Error('runQuery() no aplica en Spanner — usar spanner* helpers');
  }
}

async function runQueryRows(client, sql) {
  switch (adapter.dbms) {
    case 'postgres': {
      const r = await client.query(sql); return r.rows;
    }
    case 'mysql': {
      const [rows] = await client.query(sql); return rows;
    }
    case 'sqlserver': {
      const r = await client.request().query(sql); return r.recordset;
    }
    case 'oracle': {
      const r = await client.execute(sql, [], { outFormat: 4002 /* OBJECT */ });
      return r.rows ?? [];
    }
    case 'db2': {
      return await new Promise((resolve, reject) =>
        client.query(sql, (err, rows) => err ? reject(err) : resolve(rows ?? [])),
      );
    }
    case 'spanner': {
      const [rows] = await client.run({ sql });
      return rows.map((r) => r.toJSON());
    }
  }
}

// Spanner-specific helpers
async function spannerUpdateSchema(database, statements) {
  const [operation] = await database.updateSchema(statements);
  await operation.promise();
}
async function spannerInsert(database, table, row) {
  await database.runTransactionAsync(async (txn) => {
    txn.insert(table, row);
    await txn.commit();
  });
}
async function spannerDelete(database, table, key) {
  const keys = Object.values(key);
  await database.runTransactionAsync(async (txn) => {
    txn.deleteRows(table, [keys]);
    await txn.commit();
  });
}

// ─────────────────────────────────────────────────────────────────
// Aplicación de una migración
// ─────────────────────────────────────────────────────────────────

async function applyMigration(mig, direction) {
  const filename = mig[direction];
  if (!filename) {
    throw new Error(`Migración ${mig.num}: no tiene .${direction}.sql`);
  }
  const sql = readFileSync(join(MIGRATIONS_DIR, filename), 'utf8');
  if (!sql.trim()) {
    console.log(`  ⊘ ${filename}: vacío, marcando como ${direction === 'up' ? 'aplicada' : 'revertida'}`);
    return;
  }

  console.log(`  → ${direction === 'up' ? '↑' : '↓'} ${filename}`);

  const pool = adapter.createPool(loadDbConfig());
  let client;
  try {
    client = await acquireClient(pool);

    // Activar bypass de triggers metadata (session-scoped)
    await adapter.beginMetadataChange(client);

    try {
      // Ejecutar el SQL completo de la migración
      await adapter._executeMultiStatement(client, sql);

      // Registrar/des-registrar en _migrations
      if (direction === 'up') {
        await recordApplied(client, mig);
      } else {
        await removeApplied(client, mig.num);
      }
    } finally {
      // Limpiar bypass (best-effort)
      await adapter.endMetadataChange(client);
    }
  } finally {
    if (client) await releaseClient(pool, client);
    await closePool(pool);
  }
}

async function acquireClient(pool) {
  switch (adapter.dbms) {
    case 'postgres': return await pool.connect();
    case 'mysql':    return await pool.getConnection();
    case 'sqlserver': await pool.connect(); return pool; // mssql usa el pool directo
    case 'oracle':   return await pool.getConnection();
    case 'db2':      return await new Promise((res, rej) =>
                       pool.open((err, db) => err ? rej(err) : res(db)));
    case 'spanner':  return pool; // Spanner pool = database directo
  }
}

async function releaseClient(pool, client) {
  switch (adapter.dbms) {
    case 'postgres': client.release(); break;
    case 'mysql':    client.release(); break;
    case 'sqlserver': /* mssql pool no requiere release explícito por request */ break;
    case 'oracle':   await client.close(); break;
    case 'db2':      await new Promise((res) => client.close(res)); break;
    case 'spanner':  /* spanner pool no requiere release */ break;
  }
}

async function closePool(pool) {
  switch (adapter.dbms) {
    case 'postgres': await pool.end(); break;
    case 'mysql':    await pool.end(); break;
    case 'sqlserver': await pool.close(); break;
    case 'oracle':   await pool.close(); break;
    case 'db2':      pool.close(); break;
    case 'spanner':  /* no se cierra entre migraciones */ break;
  }
}

function loadDbConfig() {
  return {
    host:        process.env.DB_HOST,
    port:        process.env.DB_PORT,
    database:    process.env.DB_NAME,
    user:        process.env.DB_USER,
    password:    process.env.DB_PASSWORD,
    serviceName: process.env.DB_SERVICE_NAME,    // Oracle
    projectId:   process.env.GCP_PROJECT,         // Spanner
    instance:    process.env.SPANNER_INSTANCE,    // Spanner
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
  };
}

// ─────────────────────────────────────────────────────────────────
// Comandos top-level
// ─────────────────────────────────────────────────────────────────

async function cmdUp(targetNum) {
  const pool = adapter.createPool(loadDbConfig());
  const client = await acquireClient(pool);
  await ensureMigrationsTable(client);
  const applied = await getApplied(client);
  await releaseClient(pool, client);
  await closePool(pool);

  const migrations = listMigrationFiles();
  const pending = migrations
    .filter((m) => !applied.has(m.num))
    .filter((m) => targetNum == null || m.num <= targetNum);

  if (pending.length === 0) {
    console.log('✓ Sin migraciones pendientes.');
    return;
  }
  console.log(`Aplicando ${pending.length} migración(es) [${adapter.dbms}]:`);
  for (const m of pending) {
    await applyMigration(m, 'up');
  }
  console.log(`✓ ${pending.length} aplicada(s).`);
}

async function cmdDown(targetNum) {
  if (targetNum == null) {
    throw new Error('Comando `down` requiere número objetivo: `migrate down N`');
  }
  const pool = adapter.createPool(loadDbConfig());
  const client = await acquireClient(pool);
  await ensureMigrationsTable(client);
  const applied = await getApplied(client);
  await releaseClient(pool, client);
  await closePool(pool);

  const migrations = listMigrationFiles();
  const toRevert = migrations
    .filter((m) => applied.has(m.num) && m.num > targetNum)
    .reverse();

  if (toRevert.length === 0) {
    console.log(`✓ Sin migraciones por revertir hasta ${targetNum}.`);
    return;
  }
  console.log(`Revertiendo ${toRevert.length} migración(es) [${adapter.dbms}]:`);
  for (const m of toRevert) {
    if (!m.down) {
      throw new Error(`No puedo revertir ${m.num}_${m.name}: sin .down.sql`);
    }
    await applyMigration(m, 'down');
  }
  console.log(`✓ ${toRevert.length} revertida(s). BD ahora en #${targetNum}.`);
}

async function cmdStatus() {
  const pool = adapter.createPool(loadDbConfig());
  const client = await acquireClient(pool);
  await ensureMigrationsTable(client);
  const applied = await getApplied(client);
  await releaseClient(pool, client);
  await closePool(pool);

  const migrations = listMigrationFiles();
  console.log(`\nEstado [${adapter.dbms}, triggers: ${adapter.supportsTriggers ? 'sí' : 'no'}]:\n`);
  for (const m of migrations) {
    const status = applied.has(m.num) ? '✓' : ' ';
    const reversible = m.down ? '↓' : ' ';
    console.log(`  [${status}] [${reversible}] ${String(m.num).padStart(4, '0')}_${m.name}`);
  }
  console.log(`\n${applied.size}/${migrations.length} aplicada(s). ↓ = reversible.`);
}

async function cmdTriggers() {
  if (!adapter.supportsTriggers) {
    console.log(`⚠ ${adapter.dbms} no soporta triggers. La protección vive solo en Capa 1 (middleware).`);
    return;
  }
  const pool = adapter.createPool(loadDbConfig());
  const client = await acquireClient(pool);
  try {
    console.log(`Aplicando triggers nativos para ${adapter.dbms}...`);
    await adapter.applyTriggers(client);
    console.log('✓ Triggers aplicados.');
  } finally {
    await releaseClient(pool, client);
    await closePool(pool);
  }
}

// ─────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────

async function main() {
  const cmd = process.argv[2] || 'up';
  const arg = process.argv[3];
  const targetN = arg != null ? Number(arg) : undefined;

  try {
    switch (cmd) {
      case 'up':       await cmdUp(targetN); break;
      case 'down':     await cmdDown(targetN); break;
      case 'status':   await cmdStatus(); break;
      case 'triggers': await cmdTriggers(); break;
      default:
        console.error(`Uso: migrate.js [up [N] | down N | status | triggers]`);
        process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

main();
