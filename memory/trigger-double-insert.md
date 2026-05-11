---
name: Trigger BD auto-insert + service INSERT explícito = PK colisión
description: Si una tabla tiene trigger AFTER UPDATE que inserta en bitácora, NO duplicar el INSERT en service. Resultado: pk_violation 23505.
type: feedback
---

Patrón común en este método: una tabla mutable (`variables_sistema`,
`procesos_sistema`, etc.) tiene un trigger `AFTER UPDATE` que inserta una
fila de auditoría en su tabla `_historia` correspondiente. Inserciones
explícitas adicionales desde el service causan **PK colisión** cuando los
timestamps coinciden.

**Ejemplo real (v1.4.8 → v1.4.9):**

```js
// service.js — INCORRECTO
await withTransaction(async c => {
  await insertVariableHistoria(c, { ... });   // ← INSERT explícito
  await updateVariable(c, { ... });            // ← trigger AFTER UPDATE
});                                              // → INSERT duplicado, PK colision
```

```
ERROR: duplicate key value violates unique constraint "pk_variables_historia"
DETAIL: Key (clave, modificado_en)=(SYSTEM_MODE, 2026-05-11 ...) already exists.
```

**Why:** El trigger ya está haciendo el INSERT. El service no necesita hacerlo
otra vez. Solo el UPDATE basta.

**How to apply:**

1. ANTES de escribir un INSERT en service hacia una tabla `_historia` o
   `_audit`: ejecutar `\d+ <tabla_padre>` en psql para ver triggers.
2. Si hay trigger `AFTER UPDATE`/`AFTER INSERT` que escribe en la bitácora:
   solo hacer el UPDATE/INSERT en la tabla padre y dejar que el trigger haga
   la bitácora.
3. Para pasar metadata adicional al trigger (motivo, ip_origen, user-agent):
   usar `set_config('app.audit_X', $1, true)` (alias: `SET LOCAL`) ANTES del
   UPDATE. El trigger lo lee con `current_setting('app.audit_X', true)`.
4. El parámetro `true` en `current_setting` evita error si la variable no se
   definió — devuelve string vacío. Combinar con `NULLIF('', '')` para tener
   NULL en BD.

**Patrón canónico:**

```js
await withTransaction(async c => {
  if (motivo)   await c.query(`SELECT set_config('app.audit_motivo', $1, true)`, [motivo]);
  if (ipOrigen) await c.query(`SELECT set_config('app.audit_ip_origen', $1, true)`, [ipOrigen]);
  await q.updateVariable(c, { ... });   // ← trigger AFTER UPDATE captura todo
});
```

Aplica a: variables_historia, procesos_historia (si existe), audit_log,
respaldos_log (si tiene trigger).
