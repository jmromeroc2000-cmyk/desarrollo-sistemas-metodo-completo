// templates/db-adapters/_interface.js
// Interface común que TODOS los adapters cumplen.
// NO se importa directamente — sirve como contrato documentado + base class.

/**
 * @typedef {Object} DbAdapter
 * @property {('postgres'|'mysql'|'sqlserver'|'oracle'|'db2'|'spanner')} dbms
 * @property {boolean} supportsTriggers
 * @property {() => string} genUuid
 * @property {() => string} now
 * @property {(identifier: string) => string} quote
 * @property {(opts: UpsertOpts) => string} upsertSql
 * @property {(client: any, fn: () => Promise<any>) => Promise<any>} bypassTriggers
 * @property {(client: any) => Promise<void>} applyTriggers
 * @property {(config: any) => Pool} createPool
 */

/**
 * @typedef {Object} UpsertOpts
 * @property {string} table
 * @property {string[]} conflictColumns
 * @property {string[]} updateColumns
 * @property {string[]} insertColumns
 */

import { randomUUID } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

export class BaseAdapter {
  /** @type {'postgres'|'mysql'|'sqlserver'|'oracle'|'db2'|'spanner'} */
  dbms = 'postgres';

  /** @type {boolean} */
  supportsTriggers = true;

  /** UUIDs los genera la app — todos los DBMS los almacenamos como CHAR(36). */
  genUuid() {
    return randomUUID();
  }

  /**
   * Timestamp ISO 8601 con precisión de milisegundos.
   * Razón: ms es el común denominador de los 6 DBMS. JS Date usa ms.
   * No usar clock_timestamp() o sysdate — varían por DBMS.
   */
  now() {
    return new Date().toISOString();
  }

  /**
   * Quoting de identificadores. Cada adapter override este método.
   * Postgres/Spanner:    "users"
   * MySQL:               `users`
   * SQL Server:          [users]
   * Oracle/DB2:          "users"  (case-sensitive si está quoted)
   */
  quote(ident) {
    return `"${ident.replace(/"/g, '""')}"`;
  }

  /** Cada adapter override con su sintaxis de UPSERT. */
  upsertSql(_opts) {
    throw new Error('upsertSql() debe ser implementado por el adapter concreto');
  }

  /** Cada adapter override con su mecanismo de bypass de triggers. */
  async bypassTriggers(_client, _fn) {
    throw new Error('bypassTriggers() debe ser implementado por el adapter concreto');
  }

  /**
   * Aplica triggers nativos del DBMS leyendo `<adapter-dir>/triggers.sql`.
   * Si el archivo no existe (caso Spanner), no-op.
   */
  async applyTriggers(client) {
    const path = this._triggersPath();
    if (!path || !existsSync(path)) {
      return; // Spanner u otros sin triggers
    }
    const sql = readFileSync(path, 'utf8');
    if (!sql.trim()) return;
    // Cada adapter define cómo ejecutar (semicolons múltiples, etc.)
    await this._executeMultiStatement(client, sql);
  }

  /** Override por adapter — path local a su triggers.sql. */
  _triggersPath() {
    return null;
  }

  /** Override por adapter — algunos DBMS no soportan multi-statement queries. */
  async _executeMultiStatement(_client, _sql) {
    throw new Error('_executeMultiStatement() debe ser implementado por el adapter');
  }

  /** Cada adapter override con su driver de pool. */
  createPool(_config) {
    throw new Error('createPool() debe ser implementado por el adapter concreto');
  }

  /**
   * Activa el bypass de los triggers de protección de metadata en la sesión
   * actual. Ejecutado por el migration runner ANTES de cada migración.
   * Cada adapter override con su mecanismo (session var/context/variable).
   * No-op en spanner (no hay triggers).
   */
  async beginMetadataChange(_client) {
    throw new Error('beginMetadataChange() debe ser implementado por el adapter');
  }

  /**
   * Limpia el bypass (opcional — la sesión también lo limpia al cerrar).
   * Best-effort: si falla, no propagar.
   */
  async endMetadataChange(_client) {
    throw new Error('endMetadataChange() debe ser implementado por el adapter');
  }
}
