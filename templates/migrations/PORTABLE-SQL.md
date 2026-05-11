# SQL portable para migraciones multi-DBMS

> Toda migración del método v3.0+ es **SQL-92 estricto** para garantizar
> portabilidad a los 6 DBMS soportados: PostgreSQL, MySQL, SQL Server,
> Oracle, DB2 y Google Cloud Spanner.

## Tipos de datos portables

| Concepto | Sintaxis portable | Razón |
|----------|-------------------|-------|
| Texto corto | `VARCHAR(N)` con N explícito | Universal |
| Texto largo | `VARCHAR(4000)` o usar TEXT en CLOB en Oracle/DB2; **evitar** si posible | Spanner: `STRING(MAX)`. Diferencias sutiles. |
| Boolean | `SMALLINT` con `CHECK (col IN (0,1))` | `BOOLEAN` no existe en Oracle/DB2 nativos. Decisión histórica `0\|1`. |
| Entero | `INTEGER` o `BIGINT` | Universal |
| Decimal | `NUMERIC(p,s)` | Universal SQL-92 (`DECIMAL` también funciona) |
| UUID | `CHAR(36)` | UUIDs los genera la app. Almacenamiento texto portable. |
| Timestamp ISO | `VARCHAR(40)` con ISO 8601 string | Evita zonas horarias inconsistentes entre DBMS. La app pasa siempre `new Date().toISOString()`. |
| Fecha sin hora | `VARCHAR(10)` con `YYYY-MM-DD` | Idem |
| JSON | `VARCHAR(N)` con JSON serializado + validación app-side | `JSONB` (PG) / `JSON` (MySQL) NO son portables. |

## Patrones DDL portables

### CREATE TABLE
```sql
CREATE TABLE mi_tabla (
    id        CHAR(36)      NOT NULL,
    nombre    VARCHAR(200)  NOT NULL,
    activo    SMALLINT      NOT NULL DEFAULT 1,
    CONSTRAINT pk_mi_tabla PRIMARY KEY (id),
    CONSTRAINT ck_activo   CHECK (activo IN (0, 1))
);
```

Funciona en los 6 DBMS sin cambios.

### ALTER TABLE
```sql
ALTER TABLE mi_tabla ADD descripcion VARCHAR(500);
ALTER TABLE mi_tabla DROP descripcion;
```

Sintaxis SQL-92 base. Algunos DBMS requieren `ADD COLUMN` explícito —
si el runner detecta error de sintaxis, retry con `ADD COLUMN`.

### FOREIGN KEY
```sql
CREATE TABLE detalles (
    id         CHAR(36)     NOT NULL,
    cabeza_id  CHAR(36)     NOT NULL,
    CONSTRAINT pk_detalles PRIMARY KEY (id),
    CONSTRAINT fk_detalles_cabeza FOREIGN KEY (cabeza_id)
        REFERENCES cabezas (id)
);
```

### CHECK constraints con IN
```sql
CONSTRAINT ck_estado CHECK (estado IN ('A', 'B', 'C'))
```

✓ Universal.

### CREATE INDEX
```sql
CREATE INDEX idx_mi_tabla_nombre ON mi_tabla (nombre);
CREATE UNIQUE INDEX uq_mi_tabla_codigo ON mi_tabla (codigo);
```

✓ Universal.

## Patrones DML portables

### INSERT con valores literales
```sql
INSERT INTO roles (id, nombre, descripcion, protegido, activo) VALUES
    ('00000001-0000-0000-0000-000000000001', 'administrador', 'Acceso total', 1, 1),
    ('00000001-0000-0000-0000-000000000002', 'operador',      'Operaciones',  1, 1);
```

✓ Universal. UUIDs hardcoded o pre-generados en JS.

### INSERT con SELECT
```sql
INSERT INTO categorias_archivo (id, nombre)
    SELECT id, nombre FROM categorias WHERE activo = 0;
```

✓ Universal.

### UPDATE multi-columna
```sql
UPDATE mi_tabla
   SET nombre = 'nuevo',
       activo = 0
 WHERE id = '00000000-0000-0000-0000-000000000001';
```

✓ Universal.

### DELETE
```sql
DELETE FROM mi_tabla WHERE activo = 0;
```

✓ Universal.

## Patrones NO portables — alternativas

### ❌ AUTO_INCREMENT / SERIAL
```sql
-- NO PORTABLE:
CREATE TABLE x (id SERIAL PRIMARY KEY, ...);          -- PG
CREATE TABLE x (id INT AUTO_INCREMENT PRIMARY KEY, ...); -- MySQL
```

**✓ Alternativa**: app genera UUIDs.
```sql
CREATE TABLE x (id CHAR(36) NOT NULL PRIMARY KEY, ...);
```

### ❌ gen_random_uuid() / NEWID() / UUID()
```sql
-- NO PORTABLE en INSERT:
INSERT INTO x (id) VALUES (gen_random_uuid());
```

**✓ Alternativa**: pasar UUIDs hardcoded en seed. Para migraciones de seed
de roles del sistema, ya están reservados los UUIDs `00000001-...-001..005`.

### ❌ ON CONFLICT / MERGE / ON DUPLICATE KEY
```sql
-- NO PORTABLE:
INSERT INTO x (...) VALUES (...) ON CONFLICT (id) DO NOTHING;
```

**✓ Alternativa**: bootstrap migrations corren una sola vez (el runner las
trackea). NO necesitan UPSERT. Para idempotencia de re-run, el runner es
quien valida `_migrations` y skipea aplicadas.

### ❌ NOW() / CURRENT_TIMESTAMP
```sql
-- NO PORTABLE (precisión y formato varían):
INSERT INTO x (creado_en) VALUES (NOW());
INSERT INTO x (creado_en) VALUES (CURRENT_TIMESTAMP);
```

**✓ Alternativa**: literal ISO 8601 en la migración:
```sql
INSERT INTO x (creado_en) VALUES ('2026-05-12T14:30:00.000Z');
```

Si se necesita timestamp "ahora" en una migración, dejarlo como `'@@NOW@@'`
y el runner lo sustituye antes de ejecutar (no implementado todavía — para
v3.1+).

### ❌ JSONB / JSON
```sql
-- NO PORTABLE:
metadata JSONB NOT NULL DEFAULT '{}'::jsonb
```

**✓ Alternativa**:
```sql
metadata VARCHAR(4000) NOT NULL DEFAULT '{}'
-- + validación de shape en app (Zod / ajv)
```

Si la query necesita acceder a campos JSON, hacer la deserialización en
el service de la app, no en SQL.

### ❌ Triggers, functions, procedures
NO van en migraciones. Se aplican post-bootstrap via:

```bash
node scripts/migrate.js triggers
```

Que lee `templates/db-adapters/<dbms>/triggers.sql` del adapter activo y
los aplica. Cada DBMS tiene su sintaxis (plpgsql, T-SQL, PL/SQL, SQL/PL,
SQL/PSM); el método entrega los 5 archivos pre-escritos.

### ❌ CREATE EXTENSION
```sql
-- PG-only:
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

**✓ Alternativa**: si necesitas funcionalidad de una extensión específica,
usar la alternativa de aplicación o usar feature-flag de migración:
`if (adapter.dbms === 'postgres') { aplicarMigracionConExtension() }`.

## Cómo verificar portabilidad

```bash
# Aplicar migraciones desde fresh DB en cada DBMS:
DB_DRIVER=postgres   node scripts/migrate.js up
DB_DRIVER=mysql      node scripts/migrate.js up
DB_DRIVER=sqlserver  node scripts/migrate.js up
DB_DRIVER=oracle     node scripts/migrate.js up    # requiere container manual
DB_DRIVER=db2        node scripts/migrate.js up    # requiere container manual
DB_DRIVER=spanner    node scripts/migrate.js up    # emulator

# CI valida los 3 primeros (postgres + mysql + sqlserver).
# Los demás requieren CI matrix opcional o validación manual.
```

Si una migración falla en un DBMS específico, revisar la lista de "NO portable"
y ajustar.
