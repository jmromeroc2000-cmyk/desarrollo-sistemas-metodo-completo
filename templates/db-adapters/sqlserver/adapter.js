// templates/db-adapters/sqlserver/adapter.js
import { BaseAdapter } from '../_interface.js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mssql from 'mssql';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class SqlServerAdapter extends BaseAdapter {
  dbms = 'sqlserver';
  supportsTriggers = true;

  quote(ident) {
    return `[${ident.replace(/]/g, ']]')}]`;
  }

  upsertSql({ table, conflictColumns, insertColumns, updateColumns }) {
    // T-SQL MERGE
    const t = this.quote(table);
    const insertList = insertColumns.map((c) => this.quote(c)).join(', ');
    const sourceList = insertColumns.map((_, i) => `@p${i + 1}`).join(', ');
    const sourceCols = insertColumns.map((c) => this.quote(c)).join(', ');
    const onClause = conflictColumns
      .map((c) => `T.${this.quote(c)} = S.${this.quote(c)}`)
      .join(' AND ');
    const updateSet = updateColumns
      .map((c) => `T.${this.quote(c)} = S.${this.quote(c)}`)
      .join(', ');
    return `MERGE INTO ${t} AS T
            USING (SELECT ${sourceList.split(', ').map((p, i) => `${p} AS ${this.quote(insertColumns[i])}`).join(', ')}) AS S(${sourceCols})
            ON (${onClause})
            WHEN MATCHED THEN UPDATE SET ${updateSet}
            WHEN NOT MATCHED THEN INSERT (${insertList}) VALUES (${sourceList});`;
  }

  async bypassTriggers(client, fn) {
    // T-SQL: DISABLE TRIGGER ALL ON <table>
    // El caller debe pasar el nombre de tabla; aquí asumimos que para tests
    // se deshabilita en todas las tablas de metadata.
    const tablas = ['tablas_sistema', 'campos_sistema', 'variables_sistema'];
    for (const t of tablas) {
      await client.request().query(`DISABLE TRIGGER ALL ON ${this.quote(t)}`);
    }
    try {
      return await fn();
    } finally {
      for (const t of tablas) {
        await client.request().query(`ENABLE TRIGGER ALL ON ${this.quote(t)}`);
      }
    }
  }

  _triggersPath() {
    return join(__dirname, 'triggers.sql');
  }

  async _executeMultiStatement(client, sql) {
    // mssql espera batches separados por GO. Dividimos por GO.
    const batches = sql.split(/^\s*GO\s*$/im).map((b) => b.trim()).filter(Boolean);
    for (const batch of batches) {
      await client.request().query(batch);
    }
  }

  createPool(config) {
    return new mssql.ConnectionPool({
      server:   config.host     ?? 'localhost',
      port:     Number(config.port ?? 1433),
      database: config.database,
      user:     config.user,
      password: config.password,
      options: {
        encrypt: true,
        trustServerCertificate: config.trustServerCertificate ?? false,
      },
      pool: { max: config.max ?? 10 },
    });
  }

  async beginMetadataChange(client) {
    await client.request().query(
      `EXEC sys.sp_set_session_context @key=N'allow_metadata_change',
                                       @value=N'true', @read_only=0`,
    );
  }

  async endMetadataChange(client) {
    try {
      await client.request().query(
        `EXEC sys.sp_set_session_context @key=N'allow_metadata_change',
                                         @value=N'false', @read_only=0`,
      );
    } catch { /* best-effort */ }
  }
}

export default new SqlServerAdapter();
