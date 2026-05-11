## Resumen

<!-- 3-5 bullets describing WHAT y POR QUÉ (no HOW — eso está en commits) -->

-
-
-

## Closes / Refs

<!-- IDs de docs/pendientes/<scope>.md o issues -->
<!-- Si cierra, `Closes <id>`. Si referencia, `Refs <id>`. -->

- Closes:
- Refs:

## Cambios en metadata

<!-- Si la PR toca campos_sistema, tablas_sistema, procesos_sistema, etc. -->
<!-- Si NO toca metadata, dejar "Sin cambios" -->

- Tablas afectadas:
- Columnas agregadas/modificadas:
- Bump de metadata_versiones: v?.?.? → v?.?.?

## Migraciones

<!-- Si la PR incluye .sql nuevos -->

- Migraciones nuevas:
- Reversibles: SÍ / NO (si NO, justificar)
- Snapshot frontend actualizado: SÍ / NO / N/A

## Test plan

<!-- Bulleted checklist de QUÉ tests cubren el cambio -->

- [ ] Tests nuevos cubren happy path
- [ ] Tests cubren errores (401/403/404/409/422 según aplique)
- [ ] Tests order-independent (sin `WHERE ts > snapshot`)
- [ ] Migraciones `npm run migrate` desde fresh DB OK
- [ ] (frontend) `npm run preflight` 7/7
- [ ] (frontend) `npm run test:a11y` light + dark verde
- [ ] E2E chromium + firefox + mobile-chrome verde

## Screenshots / Demos (UI)

<!-- Si toca UI: capturas o GIF. Si solo backend, dejar "N/A" -->

## Notas para reviewers

<!-- Cosas a las que el reviewer (humano o sub-agente) debe prestar atención -->

- Áreas de riesgo:
- Decisiones de diseño:

## Breaking changes

<!-- Si introduce breaking en el API contract -->

- [ ] Esta PR NO introduce breaking changes
- [ ] Esta PR introduce breaking; razón:
- [ ] Bump major requerido (v2 paralelo a v1 por 90 días — ver §5.1.2.F.6)

---

<!--
Pre-merge checklist (auto-validado por CI o reviewer):
  ✓ CI todos verde (backend, frontend, e2e matrix, migrations-clean-apply,
    migrations-down-syntax, metadata-snapshot-sync, a11y)
  ✓ Branch namespace correcto (feat/be-*, feat/fe-*, fix/be-*, chore/*)
  ✓ Mensajes en docs/messages/open/ revisados antes de cerrar
  ✓ docs/pendientes/<scope>.md actualizado si cierra items
-->
