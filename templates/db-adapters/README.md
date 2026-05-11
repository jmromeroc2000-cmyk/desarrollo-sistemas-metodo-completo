# DB Adapter Pattern — multi-DBMS portability

> El método v3.0.0+ soporta 6 DBMS: PostgreSQL, MySQL, SQL Server, Oracle,
> DB2 y Google Cloud Spanner. Cada uno tiene un adapter que abstrae las
> diferencias dialectales.

## Adapter interface

Todos los adapters exponen las mismas 8 funciones:

```js
// Identidad del adapter
adapter.dbms                     // 'postgres' | 'mysql' | 'sqlserver' | 'oracle' | 'db2' | 'spanner'
adapter.supportsTriggers         // boolean — Spanner: false; resto: true

// Generación de UUID (todos los DBMS usamos CHAR(36); el UUID viene de la app)
adapter.genUuid()                // → string '00000000-0000-0000-0000-000000000000'

// Timestamp del momento, ISO 8601 string. Precisión: milisegundos en TODOS los DBMS.
// (Razón: ms es el común denominador. Si necesitas más precisión,
//  usa contador app-side de fallback.)
adapter.now()                    // → '2026-05-12T14:30:00.000Z'

// Quoting de identificadores (tabla, columna)
adapter.quote('users')           // PG: "users" | MySQL: `users` | SQL Server: [users]

// UPSERT — sintaxis varía. El adapter devuelve el SQL apropiado.
adapter.upsertSql({
  table: 'productos',
  conflictColumns: ['codigo'],
  updateColumns: ['nombre', 'precio'],
})
// PG/Spanner:        INSERT INTO productos (...) VALUES (...) ON CONFLICT (codigo) DO UPDATE SET ...
// MySQL:             INSERT INTO productos (...) VALUES (...) ON DUPLICATE KEY UPDATE ...
// SQL Server/Oracle/DB2:  MERGE INTO productos USING (...) ON ... WHEN MATCHED ...

// Bypass de triggers (solo para tests)
await adapter.bypassTriggers(client, async () => { ... })
// PG:        SET session_replication_role = replica
// MySQL:     SET SESSION FOREIGN_KEY_CHECKS = 0 + DISABLE TRIGGER
// SQL Server: DISABLE TRIGGER ALL ON <table>
// Oracle/DB2: ALTER TRIGGER ... DISABLE
// Spanner:   no-op (no triggers)

// Aplicar triggers nativos del DBMS (capa 2 de defensa-en-profundidad)
await adapter.applyTriggers(client)
// Lee templates/db-adapters/<dbms>/triggers.sql y lo ejecuta
// Spanner: no-op (triggers.sql vacío)

// Connection setup
const pool = adapter.createPool(config)
```

## DBMS soportados

| DBMS | Driver npm | Triggers | UPSERT syntax | UUID en app o BD |
|------|-----------|----------|---------------|------------------|
| **postgres** | `pg` | ✅ plpgsql | `ON CONFLICT` | App-generated CHAR(36) |
| **mysql** | `mysql2` | ✅ SQL/PSM | `ON DUPLICATE KEY UPDATE` | App-generated CHAR(36) |
| **sqlserver** | `mssql` | ✅ T-SQL | `MERGE` | App-generated CHAR(36) |
| **oracle** | `oracledb` | ✅ PL/SQL | `MERGE` | App-generated CHAR(36) |
| **db2** | `ibm_db` | ✅ SQL/PL | `MERGE` | App-generated CHAR(36) |
| **spanner** | `@google-cloud/spanner` | ❌ no soporta | `INSERT OR UPDATE` | App-generated CHAR(36) |

## Estructura de cada adapter

```
templates/db-adapters/<dbms>/
├── adapter.js          # implementación de las 8 funciones
├── connection.js       # createPool helper
├── triggers.sql        # capa 2 (vacío en spanner)
├── README.md           # límites del DBMS, gotchas, validación
└── (test fixtures)
```

## Selección al bootstrap

`/stack-pick` pregunta el DBMS objetivo. `bootstrap.sh` copia el adapter
correspondiente a `Dev/src/db/adapter.js`. Si el sistema necesita correr
en múltiples DBMS simultáneamente (raro), copiar TODOS los adapters y
seleccionar runtime via `DB_DRIVER=<dbms>` env var.

## CI matrix

`.github/workflows/ci.yml` corre la suite de tests en 3 DBMS obligatorios:
PostgreSQL 16, MySQL 8, SQL Server 2022. Oracle y DB2 se validan
manualmente (containers comerciales). Spanner se valida con el emulator
de Google Cloud (`cloud-spanner-emulator`).

## Garantías de portabilidad

✅ **Schemas + DML SQL-92**: todas las migraciones son SQL-92 estricto.
  Tipos: `VARCHAR(N)`, `SMALLINT`, `INTEGER`, `BIGINT`, `NUMERIC(p,s)`,
  `TIMESTAMP`, `CHAR(36)` para UUID. Sin tipos propietarios.

✅ **No SET LOCAL ni GUCs**: la autorización vive en app-layer (Capa 1).

✅ **No clock_timestamp() ni sysdate**: timestamps de app o
  `CURRENT_TIMESTAMP(6)` SQL-2003 cuando se requiere precisión BD-side.

✅ **No JSONB**: si una columna necesita JSON, se usa `VARCHAR(MAX)` /
  `CLOB` con validación en app via Zod. Para PG/MySQL nuevos que SÍ
  tienen JSON nativo, el adapter puede optimizar opcionalmente.

✅ **UPSERT abstraído**: services usan `adapter.upsertSql()`, no SQL inline.

## Garantías de defensa-en-profundidad

✅ **Capa 1**: middleware `protectMetadata` en los 6 DBMS — bloquea HTTP
  writes a tablas de metadata.

✅ **Capa 2 (opt-in)**: triggers nativos en PG/MySQL/SQL Server/Oracle/DB2
  bloquean SQL directo. Spanner queda solo con Capa 1 (por limitación
  del DBMS).

Documentar este trade-off al stakeholder si el sistema corre en Spanner.
