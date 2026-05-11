# Memoria — índice

> Una entrada por línea, ≤150 caracteres. Líneas después de la 200 se truncan.
> Este archivo es auto-leído por Claude Code. Las entradas individuales viven
> en archivos `.md` separados con frontmatter `type: user|feedback|project|reference`.

## Gotchas técnicos (feedback)

- [pg-timestamp-precision](pg-timestamp-precision.md) — pg μs vs JS Date ms: nunca comparar con `>`/`<`. Usar count-before/after o `ORDER BY ts DESC LIMIT 1`.
- [trigger-double-insert](trigger-double-insert.md) — si una tabla tiene trigger AFTER UPDATE que inserta en bitácora, NO duplicar el INSERT en service. PK colisiona.
- [session-replication-role](session-replication-role.md) — bypass de triggers en tests: `SET session_replication_role = replica`. SOLO en tests, nunca en producción.
- [set-local-transaction](set-local-transaction.md) — `SET LOCAL` y `set_config(..., is_local=true)` solo funcionan dentro de `BEGIN/COMMIT`. Sin transacción, no surten efecto.

## Convenciones del proyecto (project)

- [branch-namespace](branch-namespace.md) — feat/be-*, feat/fe-*, fix/be-*, chore/docs-*. Prefijo identifica al agente dueño.
- [migrations-vs-service](migrations-vs-service.md) — migración va PRIMERO en el commit, nunca después del service. Sin esto: regresión silenciosa.

## Referencias (reference)

- [protocolo-mensajes](protocolo-mensajes.md) — docs/messages/open + archived. Ver `docs/messages/README.md`.
- [pendientes-ssot](pendientes-ssot.md) — docs/PENDIENTES.md es SSOT del trabajo pendiente. IDs `<scope>-N` referenciables desde commits.
