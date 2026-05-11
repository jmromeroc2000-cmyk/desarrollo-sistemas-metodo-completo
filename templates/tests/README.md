# Tests portables multi-DBMS

Plantillas y helpers que cada proyecto copia a `Dev/tests/` al bootstrap.
Garantizan que la suite de tests del backend corre idénticamente en los
6 DBMS soportados.

## Estructura

```
templates/tests/
├── helpers/
│   ├── db-test-helper.js     ← acquireClient/releaseClient/runQuery/cleanTables/countRows
│   └── setup-test-db.js      ← globalSetup: aplica migraciones + triggers
└── integration/
    └── example-portable.test.js  ← test canónico que demuestra los 5 patrones
```

## Patrones canónicos

| # | Patrón | Cuándo |
|---|--------|--------|
| 1 | **count-before/after** | Verificar "se insertó/borró N filas" |
| 2 | **ORDER BY ts DESC LIMIT 1** | Obtener última fila por orden temporal |
| 3 | **bypassTriggers(client, fn)** | Tests que tocan tablas con triggers Capa 2 |
| 4 | **placeholders adaptados** | SQL parametrizado portable (ph() helper) |
| 5 | **normalizeRow(row)** | Defensa contra mayúsculas Oracle/DB2 vs minúsculas PG/MySQL |

## Patrones PROHIBIDOS

| Patrón | Por qué | Alternativa |
|--------|---------|-------------|
| `WHERE ts > $1` con $1 = JS Date | Precisión μs/ns/ms varía entre DBMS | count-before/after |
| `INSERT ... RETURNING *` | Solo PG/Oracle. No portable. | INSERT + SELECT separados |
| `LAST_INSERT_ID()` | MySQL-only. | App genera UUID antes del INSERT |
| `gen_random_uuid()` en INSERT | PG-only. | App genera UUID antes |
| `JSON_VALUE(col, '$.path')` | Sintaxis varía mucho. | Parsear en app después del SELECT |

## Vitest config recomendado

```js
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals:        false,
    environment:    'node',
    pool:           'forks',           // procesos aislados
    fileParallelism: false,            // BD compartida; serialización
    sequence: { shuffle: false },      // orden determinístico
    globalSetup: ['./tests/helpers/setup-test-db.js'],  // aplica migrations + triggers
    setupFiles:  ['./tests/helpers/setupEnv.js'],       // carga .env.test
    include:     ['tests/**/*.{test,spec}.js'],
  },
});
```

## Cómo correr tests contra cada DBMS localmente

```bash
# PostgreSQL (default)
docker run -d -e POSTGRES_DB=test -e POSTGRES_USER=t -e POSTGRES_PASSWORD=t -p 5432:5432 postgres:16-alpine
DB_DRIVER=postgres DB_HOST=localhost DB_PORT=5432 DB_NAME=test DB_USER=t DB_PASSWORD=t npm test

# MySQL
docker run -d -e MYSQL_DATABASE=test -e MYSQL_USER=t -e MYSQL_PASSWORD=t -e MYSQL_ROOT_PASSWORD=r -p 3306:3306 mysql:8
DB_DRIVER=mysql DB_HOST=localhost DB_PORT=3306 DB_NAME=test DB_USER=t DB_PASSWORD=t npm test

# SQL Server
docker run -d -e ACCEPT_EULA=Y -e SA_PASSWORD='yourStrong!Password1' -p 1433:1433 mcr.microsoft.com/mssql/server:2022-latest
# Crear DB primero: docker exec ... -Q "CREATE DATABASE test"
DB_DRIVER=sqlserver DB_HOST=localhost DB_PORT=1433 DB_NAME=test DB_USER=sa DB_PASSWORD='yourStrong!Password1' npm test
```

## CI automático

Ver `.github/workflows/ci-matrix.yml` — corre los 3 DBMS obligatorios en cada PR.
Para Oracle/DB2/Spanner ver `ci-matrix-opt.yml` (workflow_dispatch).
