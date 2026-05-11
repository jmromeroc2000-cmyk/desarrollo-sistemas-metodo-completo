#!/usr/bin/env node
// templates/migrate.js — runner de migraciones con soporte up/down.
// Cada proyecto copia este archivo a Dev/scripts/migrate.js al bootstrap.
//
// Uso:
//   node scripts/migrate.js                  # aplica todas las .up.sql pendientes
//   node scripts/migrate.js up               # idem
//   node scripts/migrate.js up <N>           # aplica hasta migración número N
//   node scripts/migrate.js down <N>         # revierte hasta migración N+1 (deja N aplicada)
//   node scripts/migrate.js status           # lista aplicadas/pendientes
//
// Convención de nombre: NNNN_descripcion.up.sql + NNNN_descripcion.down.sql

import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

const pool = new pg.Pool({
  host:     process.env.DB_HOST     ?? 'localhost',
  port:     Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME     ?? 'sistema_dev',
  user:     process.env.DB_USER     ?? 'inv_user',
  password: process.env.DB_PASSWORD ?? '',
});

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      number     INTEGER      NOT NULL,
      filename   VARCHAR(255) NOT NULL,
      direction  VARCHAR(8)   NOT NULL,
      applied_at TIMESTAMP    NOT NULL DEFAULT NOW(),
      CONSTRAINT pk_migrations PRIMARY KEY (number, direction)
    )
  `);
}

function parseFilename(filename) {
  // NNNN_descripcion.up.sql → { n: 1, name: 'descripcion', dir: 'up' }
  const m = filename.match(/^(\d+)_(.+)\.(up|down)\.sql$/);
  if (!m) return null;
  return { n: Number(m[1]), name: m[2], dir: m[3] };
}

async function listMigrations() {
  const files = await readdir(MIGRATIONS_DIR);
  const map = new Map(); // n → { n, name, hasUp, hasDown }
  for (const f of files) {
    const p = parseFilename(f);
    if (!p) continue;
    if (!map.has(p.n)) map.set(p.n, { n: p.n, name: p.name, hasUp: false, hasDown: false });
    const entry = map.get(p.n);
    if (p.dir === 'up') entry.hasUp = true;
    if (p.dir === 'down') entry.hasDown = true;
  }
  return [...map.values()].sort((a, b) => a.n - b.n);
}

async function getApplied(client) {
  const { rows } = await client.query(
    `SELECT number FROM _migrations WHERE direction='up' ORDER BY number`,
  );
  return new Set(rows.map((r) => r.number));
}

async function runMigration(client, mig, direction) {
  const filename = `${String(mig.n).padStart(4, '0')}_${mig.name}.${direction}.sql`;
  const fullpath = join(MIGRATIONS_DIR, filename);
  console.log(`  → ${direction.toUpperCase()} ${filename}`);
  const sql = await readFile(fullpath, 'utf8');

  // Las migraciones traen su propio BEGIN/COMMIT. El runner solo ejecuta el SQL.
  await client.query(sql);

  if (direction === 'up') {
    await client.query(
      `INSERT INTO _migrations (number, filename, direction) VALUES ($1, $2, 'up')`,
      [mig.n, filename],
    );
  } else {
    await client.query(`DELETE FROM _migrations WHERE number = $1 AND direction = 'up'`, [
      mig.n,
    ]);
    await client.query(
      `INSERT INTO _migrations (number, filename, direction) VALUES ($1, $2, 'down')
       ON CONFLICT (number, direction) DO UPDATE SET applied_at = NOW(), filename = EXCLUDED.filename`,
      [mig.n, filename],
    );
  }
}

async function up(targetN) {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const all = await listMigrations();
    const applied = await getApplied(client);

    let count = 0;
    for (const mig of all) {
      if (applied.has(mig.n)) continue;
      if (targetN !== undefined && mig.n > targetN) break;
      if (!mig.hasUp) throw new Error(`Migración ${mig.n} no tiene .up.sql`);
      if (!mig.hasDown) {
        console.warn(`⚠️  ${mig.n}_${mig.name}: sin .down.sql (no reversible)`);
      }
      await runMigration(client, mig, 'up');
      count++;
    }

    console.log(`\n${count} migración(es) aplicada(s).`);
    if (count === 0) console.log('(BD ya está al día)');
  } finally {
    client.release();
  }
}

async function down(targetN) {
  if (targetN === undefined) {
    throw new Error('down requiere un número objetivo: `migrate.js down N`');
  }
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const all = await listMigrations();
    const applied = await getApplied(client);

    // Revertir desde la más alta aplicada hasta N+1 (no toca N)
    const toRevert = all
      .filter((m) => applied.has(m.n) && m.n > targetN)
      .sort((a, b) => b.n - a.n); // descendente

    if (toRevert.length === 0) {
      console.log(`Sin migraciones que revertir por encima de ${targetN}.`);
      return;
    }

    console.log(`Revertiendo ${toRevert.length} migración(es) hasta dejar #${targetN}:`);
    for (const mig of toRevert) {
      if (!mig.hasDown) {
        throw new Error(`No puedo revertir ${mig.n}_${mig.name}: falta .down.sql`);
      }
      await runMigration(client, mig, 'down');
    }

    console.log(`\n${toRevert.length} migración(es) revertida(s). BD ahora está en #${targetN}.`);
  } finally {
    client.release();
  }
}

async function status() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const all = await listMigrations();
    const applied = await getApplied(client);

    console.log('Estado de migraciones:\n');
    for (const m of all) {
      const status = applied.has(m.n) ? '✓' : ' ';
      const reversible = m.hasDown ? '↓' : ' ';
      console.log(`  [${status}] [${reversible}] ${String(m.n).padStart(4, '0')}_${m.name}`);
    }
    console.log(`\n${applied.size}/${all.length} aplicadas. ↓ = reversible (tiene .down.sql)`);
  } finally {
    client.release();
  }
}

async function main() {
  const cmd = process.argv[2] || 'up';
  const arg = process.argv[3];
  const targetN = arg ? Number(arg) : undefined;

  try {
    switch (cmd) {
      case 'up':
        await up(targetN);
        break;
      case 'down':
        await down(targetN);
        break;
      case 'status':
        await status();
        break;
      default:
        console.error(`Uso: migrate.js [up|down|status] [N]`);
        process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
