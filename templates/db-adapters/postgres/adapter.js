// templates/db-adapters/postgres/adapter.js
import { BaseAdapter } from '../_interface.js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class PostgresAdapter extends BaseAdapter {
  dbms = 'postgres';
  supportsTriggers = true;

  quote(ident) {
    return `"${ident.replace(/"/g, '""')}"`;
  }

  upsertSql({ table, conflictColumns, insertColumns, updateColumns }) {
    const cols = insertColumns.map((c) => this.quote(c)).join(', ');
    const params = insertColumns.map((_, i) => `$${i + 1}`).join(', ');
    const conflict = conflictColumns.map((c) => this.quote(c)).join(', ');
    const updates = updateColumns.map((c) => `${this.quote(c)} = EXCLUDED.${this.quote(c)}`).join(', ');
    return `INSERT INTO ${this.quote(table)} (${cols}) VALUES (${params})
            ON CONFLICT (${conflict}) DO UPDATE SET ${updates}`;
  }

  async bypassTriggers(client, fn) {
    await client.query(`SET session_replication_role = replica`);
    try {
      return await fn();
    } finally {
      await client.query(`SET session_replication_role = DEFAULT`);
    }
  }

  _triggersPath() {
    return join(__dirname, 'triggers.sql');
  }

  async _executeMultiStatement(client, sql) {
    // pg acepta multi-statement en una sola query
    await client.query(sql);
  }

  createPool(config) {
    return new pg.Pool({
      host:     config.host     ?? 'localhost',
      port:     Number(config.port ?? 5432),
      database: config.database,
      user:     config.user,
      password: config.password,
      max:      config.max ?? 10,
    });
  }
}

export default new PostgresAdapter();
