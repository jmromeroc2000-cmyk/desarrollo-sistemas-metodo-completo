// templates/db-adapters/oracle/adapter.js
import { BaseAdapter } from '../_interface.js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// import oracledb from 'oracledb';  // descomenta cuando esté instalado

const __dirname = dirname(fileURLToPath(import.meta.url));

export class OracleAdapter extends BaseAdapter {
  dbms = 'oracle';
  supportsTriggers = true;

  quote(ident) {
    return `"${ident.replace(/"/g, '""').toUpperCase()}"`;
  }

  upsertSql({ table, conflictColumns, insertColumns, updateColumns }) {
    // Oracle MERGE
    const t = this.quote(table);
    const sourceList = insertColumns
      .map((c, i) => `:p${i + 1} AS ${this.quote(c)}`)
      .join(', ');
    const onClause = conflictColumns
      .map((c) => `T.${this.quote(c)} = S.${this.quote(c)}`)
      .join(' AND ');
    const updateSet = updateColumns
      .map((c) => `T.${this.quote(c)} = S.${this.quote(c)}`)
      .join(', ');
    const insertList = insertColumns.map((c) => this.quote(c)).join(', ');
    const insertVals = insertColumns.map((c) => `S.${this.quote(c)}`).join(', ');
    return `MERGE INTO ${t} T
            USING (SELECT ${sourceList} FROM DUAL) S
            ON (${onClause})
            WHEN MATCHED THEN UPDATE SET ${updateSet}
            WHEN NOT MATCHED THEN INSERT (${insertList}) VALUES (${insertVals})`;
  }

  async bypassTriggers(client, fn) {
    // Oracle: ALTER TRIGGER <name> DISABLE — pero necesitamos nombres.
    // Para tests, deshabilitamos triggers de las tablas de metadata:
    const triggers = ['TRG_TABLAS_SISTEMA_IMM', 'TRG_CAMPOS_SISTEMA_IMM',
                      'TRG_VARIABLES_SISTEMA_IMM'];
    for (const trg of triggers) {
      try { await client.execute(`ALTER TRIGGER ${trg} DISABLE`); } catch {}
    }
    try {
      return await fn();
    } finally {
      for (const trg of triggers) {
        try { await client.execute(`ALTER TRIGGER ${trg} ENABLE`); } catch {}
      }
    }
  }

  _triggersPath() {
    return join(__dirname, 'triggers.sql');
  }

  async _executeMultiStatement(client, sql) {
    // Oracle: cada CREATE TRIGGER ... termina con '/'  (slash)
    // Dividir por /  (en su propia línea)
    const blocks = sql.split(/^\s*\/\s*$/m).map((b) => b.trim()).filter(Boolean);
    for (const block of blocks) {
      await client.execute(block);
    }
  }

  createPool(config) {
    // Lazy import para no requerir el driver instalado si no se usa
    const oracledb = require('oracledb');
    return oracledb.createPool({
      connectString: `${config.host ?? 'localhost'}:${config.port ?? 1521}/${config.serviceName ?? config.database}`,
      user:          config.user,
      password:      config.password,
      poolMax:       config.max ?? 10,
    });
  }

  async beginMetadataChange(client) {
    await client.execute(`BEGIN APP_CTX_PKG.set_allow_metadata_change('true'); END;`);
  }

  async endMetadataChange(client) {
    try {
      await client.execute(`BEGIN APP_CTX_PKG.set_allow_metadata_change('false'); END;`);
    } catch { /* best-effort */ }
  }
}

export default new OracleAdapter();
