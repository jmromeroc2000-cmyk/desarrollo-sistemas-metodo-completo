# Bypass mechanisms — referencia rápida por DBMS

Documento de referencia para implementadores del migration runner (M4) y
para auditores que necesitan entender cómo se autoriza el cambio de
metadata en cada DBMS soportado.

## Patrón común

1. El migration runner detecta el DBMS via `adapter.dbms`.
2. ANTES de aplicar cada migración SQL, ejecuta la sentencia de bypass
   correspondiente al DBMS.
3. La migración SQL ejecuta normalmente — los triggers detectan el bypass
   activo y permiten el cambio.
4. Al cerrar la conexión, el bypass se limpia automáticamente (todos los
   mecanismos son session-scoped).

## Sentencia de bypass por DBMS

### postgres
```sql
SELECT set_config('app.allow_metadata_change', 'true', false);
-- O equivalente:
SET app.allow_metadata_change = 'true';
```
**Scope:** sesión. Se limpia al cerrar la conexión.
**Lectura desde trigger:** `current_setting('app.allow_metadata_change', true) = 'true'`

### mysql
```sql
SET @app_allow_metadata_change = 'true';
```
**Scope:** sesión (user variable). Se limpia al cerrar la conexión.
**Lectura desde trigger:** `COALESCE(@app_allow_metadata_change, 'false') = 'true'`

### sqlserver
```sql
EXEC sys.sp_set_session_context @key=N'allow_metadata_change',
                                @value=N'true', @read_only=0;
```
**Scope:** sesión (session context). Se limpia al cerrar la conexión.
**Lectura desde trigger:** `SESSION_CONTEXT(N'allow_metadata_change') = N'true'`

### oracle
```sql
BEGIN APP_CTX_PKG.set_allow_metadata_change('true'); END;
```
Requiere haber aplicado el package `APP_CTX_PKG` y el contexto `APP_CTX`
(ambos creados por `triggers.sql`).
**Scope:** sesión (application context). Se limpia al cerrar.
**Lectura desde trigger:** `SYS_CONTEXT('APP_CTX', 'allow_metadata_change') = 'true'`

### db2
```sql
SET app_allow_metadata_change = 'true';
```
Requiere haber creado la global variable (lo hace `triggers.sql`).
**Scope:** sesión (global variable). Se limpia al cerrar.
**Lectura desde trigger:** `app_allow_metadata_change = 'true'`

### spanner
N/A — Spanner no tiene triggers, no necesita bypass. La protección vive
exclusivamente en Capa 1 (middleware Express).

## Implementación en el adapter

Cada adapter debe exponer dos métodos relacionados:

```js
adapter.beginMetadataChange(client)   // ejecuta el bypass
adapter.endMetadataChange(client)     // limpia el bypass (opcional, la
                                       // sesión lo limpia al cerrar)
```

O usar el helper de alto nivel del runner:

```js
import { withMetadataChange } from './migrate.js';

await withMetadataChange(client, async () => {
  await aplicarMigracion(sql);
});
```

Que internamente:
1. Llama `adapter.beginMetadataChange(client)`.
2. Ejecuta la callback.
3. Llama `adapter.endMetadataChange(client)` en `finally` (best-effort).

## Garantía operativa

Los mecanismos seleccionados (session vars/contexts/variables) son TODOS
**session-scoped**: si el migration runner falla a mitad de la aplicación,
la próxima conexión (incluso desde el mismo pool) NO hereda el bypass.

El bypass NO es persistente, no se escribe a tabla, no contamina otras
sesiones. Es seguro por construcción.
