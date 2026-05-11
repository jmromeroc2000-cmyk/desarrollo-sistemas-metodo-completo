// templates/db-adapters/mysql/adapter.js
import { BaseAdapter } from '../_interface.js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class MysqlAdapter extends BaseAdapter {
  dbms = 'mysql';
  supportsTriggers = true;

  quote(ident) {
    return `\`${ident.replace(/`/g, '``')}\``;
  }

  upsertSql({ table, insertColumns, updateColumns }) {
    const cols = insertColumns.map((c) => this.quote(c)).join(', ');
    const params = insertColumns.map(() => '?').join(', ');
    const updates = updateColumns.map((c) => `${this.quote(c)} = VALUES(${this.quote(c)})`).join(', ');
    return `INSERT INTO ${this.quote(table)} (${cols}) VALUES (${params})
            ON DUPLICATE KEY UPDATE ${updates}`;
  }

  async bypassTriggers(client, fn) {
    // MySQL no permite deshabilitar triggers per-sesión; deshabilitamos FK checks
    // y dropeamos+recreamos los triggers temporalmente NO es viable.
    // Workaround estándar: el rol de test tiene permiso de TRIGGER, sin SUPER.
    // Para protección de metadata, los tests usan el migration runner (que
    // tiene allowMetadataChange=true), no bypass de triggers.
    await client.query(`SET SESSION FOREIGN_KEY_CHECKS = 0`);
    try {
      return await fn();
    } finally {
      await client.query(`SET SESSION FOREIGN_KEY_CHECKS = 1`);
    }
  }

  _triggersPath() {
    return join(__dirname, 'triggers.sql');
  }

  async _executeMultiStatement(client, sql) {
    // mysql2 con multipleStatements: true en createPool() soporta esto
    // Aquí dividimos por DELIMITER blocks que es típico en triggers MySQL
    const blocks = sql.split(/\bDELIMITER\s+\S+/i).filter((b) => b.trim());
    for (const block of blocks) {
      // Ejecutar cada statement individualmente
      const stmts = block.split(/;\s*$/m).map((s) => s.trim()).filter(Boolean);
      for (const stmt of stmts) {
        if (stmt.toUpperCase().startsWith('DELIMITER')) continue;
        await client.query(stmt);
      }
    }
  }

  createPool(config) {
    return mysql.createPool({
      host:     config.host     ?? 'localhost',
      port:     Number(config.port ?? 3306),
      database: config.database,
      user:     config.user,
      password: config.password,
      connectionLimit: config.max ?? 10,
      multipleStatements: true, // necesario para applyTriggers
      timezone: 'Z',             // UTC siempre
    });
  }

  async beginMetadataChange(client) {
    await client.query(`SET @app_allow_metadata_change = 'true'`);
  }

  async endMetadataChange(client) {
    try {
      await client.query(`SET @app_allow_metadata_change = NULL`);
    } catch { /* best-effort */ }
  }
}

export default new MysqlAdapter();
