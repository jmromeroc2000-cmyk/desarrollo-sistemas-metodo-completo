// templates/db-adapters/db2/adapter.js
import { BaseAdapter } from '../_interface.js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class Db2Adapter extends BaseAdapter {
  dbms = 'db2';
  supportsTriggers = true;

  quote(ident) {
    return `"${ident.replace(/"/g, '""').toUpperCase()}"`;
  }

  upsertSql({ table, conflictColumns, insertColumns, updateColumns }) {
    // DB2 MERGE (SQL-PL)
    const t = this.quote(table);
    const sourceList = insertColumns.map((c, i) => `? AS ${this.quote(c)}`).join(', ');
    const onClause = conflictColumns.map((c) => `T.${this.quote(c)} = S.${this.quote(c)}`).join(' AND ');
    const updateSet = updateColumns.map((c) => `T.${this.quote(c)} = S.${this.quote(c)}`).join(', ');
    const insertList = insertColumns.map((c) => this.quote(c)).join(', ');
    const insertVals = insertColumns.map((c) => `S.${this.quote(c)}`).join(', ');
    return `MERGE INTO ${t} T
            USING (VALUES (${insertColumns.map(() => '?').join(', ')})) AS S(${insertList})
            ON ${onClause}
            WHEN MATCHED THEN UPDATE SET ${updateSet}
            WHEN NOT MATCHED THEN INSERT (${insertList}) VALUES (${insertVals})`;
  }

  async bypassTriggers(client, fn) {
    const triggers = ['TRG_TABLAS_SISTEMA_IMM', 'TRG_CAMPOS_SISTEMA_IMM',
                      'TRG_VARIABLES_SISTEMA_IMM'];
    for (const trg of triggers) {
      try { await client.query(`ALTER TRIGGER ${trg} DISABLE`); } catch {}
    }
    try {
      return await fn();
    } finally {
      for (const trg of triggers) {
        try { await client.query(`ALTER TRIGGER ${trg} ENABLE`); } catch {}
      }
    }
  }

  _triggersPath() {
    return join(__dirname, 'triggers.sql');
  }

  async _executeMultiStatement(client, sql) {
    // DB2: separar por @@@ (terminator común para triggers/procedures)
    const blocks = sql.split(/^@@@\s*$/m).map((b) => b.trim()).filter(Boolean);
    for (const block of blocks) {
      await client.query(block);
    }
  }

  createPool(config) {
    // ibm_db requires connection string format
    const ibmdb = require('ibm_db');
    return ibmdb.Pool({
      database: config.database,
      hostname: config.host ?? 'localhost',
      port:     config.port ?? 50000,
      uid:      config.user,
      pwd:      config.password,
    });
  }
}

export default new Db2Adapter();
