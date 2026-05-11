# Memoria — índice

> Una entrada por línea, ≤150 caracteres. Líneas después de la 200 se truncan.
> Auto-leído por Claude Code al iniciar sesión.

## Gotchas técnicos — Backend (feedback)

- [pg-timestamp-precision](pg-timestamp-precision.md) — pg μs vs JS Date ms: nunca comparar con `>`/`<`. Usar count-before/after o `ORDER BY ts DESC LIMIT 1`.
- [trigger-double-insert](trigger-double-insert.md) — si una tabla tiene trigger AFTER UPDATE que inserta en bitácora, NO duplicar INSERT en service. PK colisiona.
- [session-replication-role](session-replication-role.md) — bypass de triggers en tests: `SET session_replication_role = replica`. Solo en tests.
- [set-local-transaction](set-local-transaction.md) — `SET LOCAL` requiere transacción explícita (BEGIN/COMMIT). Sin ella no surte efecto.

## Gotchas técnicos — Frontend (feedback)

- [tailwind-v4-silent-fail](tailwind-v4-silent-fail.md) — Tailwind v4 ignora tokens no declarados en @theme sin warning. Detectar con preflight regla 4.
- [tanstack-querykey-mismatch](tanstack-querykey-mismatch.md) — queryKey de useQuery vs invalidateQueries debe coincidir EXACTO. Usar factory queryKeys.
- [safari-date-input](safari-date-input.md) — Safari macOS no abre calendario en `<input type="date">`. Usar `<DatePicker>` propio.
- [rhf-controller-vs-register](rhf-controller-vs-register.md) — register() solo para inputs nativos. Custom componentes requieren `<Controller>`.
- [dark-mode-contrast](dark-mode-contrast.md) — Toda clase `text-*-NNN` necesita su `dark:text-*-NNN`. Light mode pasa WCAG; dark NO sin variante.
- [scrollable-region-focusable](scrollable-region-focusable.md) — Contenedor overflow-x-auto requiere role="region" + tabIndex={0} para a11y.
- [mobile-drawer-vs-sidebar](mobile-drawer-vs-sidebar.md) — Sidebar = Sheet drawer en mobile. Tests E2E no buscan links del sidebar directo.
- [msw-handler-drift](msw-handler-drift.md) — MSW handlers se desincronizan de types. Auto-generar con `npm run msw:gen` desde metadata.
- [tanstack-query-cache-cross-resource](tanstack-query-cache-cross-resource.md) — Mutation que afecta vista de otro recurso debe invalidar AMBOS.

## Convenciones del proyecto (project)

- [branch-namespace](branch-namespace.md) — feat/be-*, feat/fe-*, fix/be-*, chore/docs-*. Prefijo identifica al agente dueño.
- [migrations-vs-service](migrations-vs-service.md) — migración va PRIMERO en el commit, nunca después del service.

## Referencias (reference)

- [protocolo-mensajes](protocolo-mensajes.md) — docs/messages/{open,archived}/ append-only. Ver docs/messages/README.md.
- [pendientes-ssot](pendientes-ssot.md) — docs/pendientes/{backend,frontend,infra,roadmap}.md por scope. IDs `<scope>-N`.
