---
name: SET LOCAL solo funciona dentro de transacción explícita
description: SET LOCAL y set_config(..., is_local=true) requieren BEGIN/COMMIT. Sin transacción, no surten efecto. Usar withTransaction.
type: feedback
---

`SET LOCAL <param> = <value>` y su equivalente funcional
`set_config(<param>, <value>, true)` son **scoped a la transacción actual**.
Sin un `BEGIN/COMMIT` explícito, NO surten efecto — pg los descarta o
los aplica solo al statement actual.

**Why:** Este método usa varios `SET LOCAL` para metadata:

- `SET LOCAL app.allow_metadata_change = 'true'` — bypass triggers de
  inmutabilidad en migraciones
- `SET LOCAL app.audit_motivo = '<motivo>'` — pasa motivo al trigger AFTER
  UPDATE para que lo persista
- `SET LOCAL app.audit_ip_origen = '<ip>'` — idem ip

Si el código de aplicación hace algo como:

```js
// INCORRECTO — sin transacción
const c = await pool.connect();
await c.query(`SELECT set_config('app.audit_motivo', $1, true)`, [motivo]);
await c.query(`UPDATE variables_sistema SET ... WHERE clave=$1`, [clave]);
// → al statement siguiente, app.audit_motivo ya está reseteado
```

El UPDATE corre, el trigger AFTER UPDATE intenta leer `app.audit_motivo`
y lo encuentra **vacío** (`current_setting` con `true` devuelve `''`).

**How to apply:**

Envolver SIEMPRE en transacción explícita:

```js
// CORRECTO — withTransaction abre BEGIN/COMMIT
await withTransaction(async c => {
  if (motivo)   await c.query(`SELECT set_config('app.audit_motivo', $1, true)`, [motivo]);
  if (ipOrigen) await c.query(`SELECT set_config('app.audit_ip_origen', $1, true)`, [ipOrigen]);
  await c.query(`UPDATE variables_sistema SET ... WHERE clave=$1`, [clave]);
  // → SET LOCAL vive hasta el COMMIT, así el trigger los ve
});
```

En migraciones SQL (psql ejecuta cada archivo en su propia conexión):

```sql
BEGIN;
SET LOCAL app.allow_metadata_change = 'true';
-- ... operaciones ...
COMMIT;
```

Sin el `BEGIN`/`COMMIT` explícitos, el `migrate.js` envuelve cada archivo en
una transacción, pero el `SET LOCAL` igual debería funcionar — sin embargo
**conviene ser explícito** porque psql interactivo y otros runners ejecutan
cada statement en auto-commit y rompería.

**Diferencia con SET (sin LOCAL):**
- `SET <param>` (session-level): persiste hasta cerrar la conexión
- `SET LOCAL <param>` (transaction-level): se revierte al COMMIT/ROLLBACK

Para metadata pasada a triggers, SIEMPRE usar `SET LOCAL` — evita leaks
entre requests cuando el pool reutiliza la conexión.
