// templates/db-adapters/index.js
// Selector de adapter al runtime según DB_DRIVER env var.
// Por default usa 'postgres'.

const DRIVER = process.env.DB_DRIVER ?? 'postgres';

let adapter;
switch (DRIVER) {
  case 'postgres':  adapter = (await import('./postgres/adapter.js')).default; break;
  case 'mysql':     adapter = (await import('./mysql/adapter.js')).default; break;
  case 'sqlserver': adapter = (await import('./sqlserver/adapter.js')).default; break;
  case 'oracle':    adapter = (await import('./oracle/adapter.js')).default; break;
  case 'db2':       adapter = (await import('./db2/adapter.js')).default; break;
  case 'spanner':   adapter = (await import('./spanner/adapter.js')).default; break;
  default:
    throw new Error(`DB_DRIVER desconocido: ${DRIVER}. Valores válidos: postgres, mysql, sqlserver, oracle, db2, spanner`);
}

console.log(`[db-adapter] Cargado: ${adapter.dbms} (triggers: ${adapter.supportsTriggers ? 'sí' : 'no'})`);

export default adapter;
export const { genUuid, now, quote, upsertSql, bypassTriggers, applyTriggers, createPool } = adapter;
