---
name: session_replication_role = replica para bypassear triggers en tests
description: Algunos triggers BD (usuarios_protegidos_no_desactivar) no tienen bypass por flag. En tests se bypassean con SET session_replication_role = replica.
type: feedback
---

PostgreSQL permite deshabilitar todos los triggers de la sesión actual con
`SET session_replication_role = replica`. Es útil **solo en tests** para
preparar/limpiar estado que el flujo normal de la app no podría reproducir.

**Why:** Algunos triggers de protección no tienen un bypass por flag de
sesión (`app.allow_metadata_change`) — son incondicionales. Ejemplos:

- `usuarios_protegidos_no_desactivar` — no permite UPDATE de `protegido=1→0`
- `usuarios_protegidos_no_borrar` — no permite DELETE de protegidos
- `variables_historia_inmutable` — no permite UPDATE/DELETE

Para testear que el código de aplicación maneja correctamente estos casos
(p.ej. devolver 409 cuando intentas revocar admin a un usuario protegido)
necesitamos preparar el state, y la única forma es bypassing el trigger.

**How to apply:**

```js
// Setup en test
const c = await pool.connect();
try {
  await c.query(`SET session_replication_role = replica`);
  await c.query(`UPDATE usuarios SET protegido = 1 WHERE id = $1`, [testUserId]);
  await c.query(`SET session_replication_role = DEFAULT`);
} finally { c.release(); }

// ... ejecutar el test que valida 409 ...

// Cleanup
const c2 = await pool.connect();
try {
  await c2.query(`SET session_replication_role = replica`);
  await c2.query(`UPDATE usuarios SET protegido = 0 WHERE id = $1`, [testUserId]);
  await c2.query(`SET session_replication_role = DEFAULT`);
} finally { c2.release(); }
```

**Reglas no negociables:**
- NUNCA en código de producción.
- NUNCA en migraciones (las migraciones usan `SET LOCAL app.allow_metadata_change`).
- Resetear a `DEFAULT` antes de soltar el cliente — si no, otra conexión del
  pool puede heredarlo (no debería, pero por seguridad).
- Documentar en comentario del test POR QUÉ se necesita.

**Permisos necesarios:** el usuario de BD debe tener role `replication` o
ser owner del schema. El usuario `inv_user` típico de los tests sí lo tiene.
Si CI usa un usuario más restringido, falla con error de permisos.

Aplica a tests de:
- `roles.test.js` — DELETE admin role a protegidos
- `usuarios.test.js` — desactivar admin protegido
- `metadata-protecciones.test.js` — verificar INSERT en bitácora inmutable
