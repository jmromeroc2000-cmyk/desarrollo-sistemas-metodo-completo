# Changelog

Todos los cambios notables del **método** (no de sistemas construidos con él)
se documentan aquí, siguiendo [Keep a Changelog](https://keepachangelog.com/)
y [Semantic Versioning](https://semver.org/lang/es/).

## Generación

Este changelog se genera automáticamente desde [conventional commits](https://www.conventionalcommits.org/)
vía `release-please` (`.github/workflows/release-please.yml`).

| Tipo de commit | Sección del changelog | Bump SemVer |
|----------------|------------------------|-------------|
| `feat(scope):` | Added | minor |
| `fix(scope):` | Fixed | patch |
| `perf(scope):` | Changed | patch |
| `refactor(scope):` | Changed | patch |
| `docs(scope):` | (oculto) | — |
| `chore(scope):` | (oculto) | — |
| `BREAKING CHANGE:` en body | Breaking | major |

Scopes convencionales: `be`, `fe`, `infra`, `meta`, `deps`, `method`.

## [3.0.0] — 2026-05-13 — Portabilidad multi-DBMS

Salto MAJOR sobre v2.0.0. **Requisito firme del usuario:** el método y todos
los sistemas que produce deben correr sobre los 6 DBMS enterprise sin cambios
en código de aplicación: PostgreSQL, MySQL, SQL Server, Oracle, DB2 y Google
Cloud Spanner.

### Added

- **db-adapter pattern** (`templates/db-adapters/{6 dirs}/`):
  - Interface común con `genUuid`, `now`, `quote`, `upsertSql`,
    `bypassTriggers`, `applyTriggers`, `beginMetadataChange`,
    `endMetadataChange`, `createPool`.
  - 6 implementaciones funcionales: postgres, mysql, sqlserver, oracle, db2, spanner.
  - Selector runtime via `DB_DRIVER` env var.
- **Capa 1 — `protectMetadata` middleware** (M1): bloquea writes HTTP a
  tablas de metadata. Funciona en los 6 DBMS sin código específico.
- **Capa 2 — triggers nativos opt-in por DBMS** (M3): 5 archivos
  `triggers.sql` funcionalmente equivalentes (plpgsql/SQL-PSM/T-SQL/
  PL-SQL/SQL-PL) + Spanner placeholder vacío.
- **Migration runner multi-DBMS** (M4): `templates/migrate.js` con
  `up [N]` / `down N` / `status` / `triggers`. SQL-92 estricto en
  migraciones; runner abre transacciones via adapter.
- **Plantillas SQL-92** (`templates/migrations/NNNN_NOMBRE.{up,down}.sql`)
  + guía `PORTABLE-SQL.md` con tipos portables, patrones DDL/DML, y
  alternativas a sintaxis NO portables (SERIAL, gen_random_uuid,
  ON CONFLICT, JSONB, etc.).
- **CI matrix** (M5):
  - `.github/workflows/ci-matrix.yml` — postgres + mysql + sqlserver
    (bloqueantes) + migration rehearsal (up→down→up) + Spanner emulator
    (opt-in).
  - `.github/workflows/ci-matrix-opt.yml` — oracle + db2 con
    `workflow_dispatch` o label-driven (containers comerciales requieren
    credenciales de registry).
- **Tests portables** (M6):
  - `templates/tests/helpers/db-test-helper.js` — `withTestClient`,
    `runQuery`, `runQueryRows`, `runQueryScalar`, `countRows`,
    `cleanTables`, `cleanProtectedTables`, `bypassTriggers`, `closePool`.
  - `templates/tests/helpers/setup-test-db.js` — globalSetup para vitest.
  - `templates/tests/integration/example-portable.test.js` — 5 patrones
    canónicos demostrados.
  - `templates/tests/README.md` — patrones canónicos + prohibidos.
- **CLAUDE.md §13.2a** — matriz de soporte multi-DBMS con bypass
  mechanism por DBMS y trade-offs documentados.

### Changed

- **CLAUDE.md §13.2** stack técnico: `db: PostgreSQL 16` reemplazado por
  matriz multi-DBMS con default PG.
- **Memoria `pg-timestamp-precision.md` → `timestamp-precision-cross-dbms.md`**:
  generalizada a los 6 DBMS con tabla de precisión por motor.
- **README.md**: nueva sección "Lo nuevo en v3.0.0" con arquitectura,
  bloques M1-M7, breaking changes, CI matrix.

### Removed

- `SET LOCAL app.allow_metadata_change` en migraciones (PG-only): ahora
  el bypass vive en `app.locals.allowMetadataChange` (app-layer).
- `BEGIN; ... COMMIT;` explícitos en migraciones: el runner abre/cierra.
- `gen_random_uuid()`, `clock_timestamp()`, `JSONB`, `CREATE EXTENSION`
  de las migraciones bootstrap (no portables).
- Triggers BD en `mig_005`/`mig_008`: se aplican post-bootstrap via
  `node scripts/migrate.js triggers` desde `templates/db-adapters/<dbms>/triggers.sql`.

### Breaking changes (v2.0.0 → v3.0.0)

Proyectos existentes con v2.0.0 PG-only requieren migración:

1. **Migraciones**: remover `BEGIN`/`COMMIT`/`SET LOCAL` explícitos.
   Convertir `gen_random_uuid()` a UUIDs hardcoded. Convertir `JSONB` a
   `VARCHAR(N)`. Eliminar `CREATE EXTENSION`. Mover triggers de mig 005/008
   a `templates/db-adapters/postgres/triggers.sql`.
2. **Service** `updateVariable`: ya no hace `set_config('app.audit_motivo')`;
   ahora pasa motivo/ip_origen como columnas regulares del INSERT a
   `variables_historia`. Ver `templates/backend/services/variables-sistema-service-example.js`.
3. **Runner**: reemplazar `scripts/migrate.js` con la nueva versión que
   usa db-adapter pattern.
4. **Tests**: reemplazar `WHERE ts > snapshot` por count-before/after
   via `countRows()` helper. Reemplazar imports directos de `pg` por
   helpers de `db-test-helper.js`.
5. **CI**: agregar `.github/workflows/ci-matrix.yml` con los 3 DBMS
   obligatorios. Branch protection settings: incluir los nuevos status
   checks (`backend-matrix (postgres)`, `(mysql)`, `(sqlserver)`,
   `migration-rehearsal (...)`).

Tiempo estimado de migración por proyecto existente: 1-2 días de
backend con tests existentes que pasan en PG; más si se quiere validar
en los 6 DBMS antes de declarar la migración completa.

## [2.0.0] — 2026-05-12 — Convivencia robusta + Codegen funcional

Salto MAJOR sobre v1.1.0. Incorpora 30+ items de la revisión crítica del
frontend agent (`docs/messages/archived/2026-05-11-1500-from-frontend...md`)
y las decisiones políticas del humano sobre rollback, API versioning, secrets
e i18n.

### Added

- **Codegen funcional** (no stubs) desde metadata:
  - `templates/codegen/meta-derive-types.js` — genera TS interfaces en
    `_generated.ts` con ApiResponse/ProblemDetail helpers.
  - `templates/codegen/front-msw-from-meta.js` — MSW v2 handlers con
    fixtures derivados de `tipo_validacion`.
  - `templates/codegen/meta-derive-openapi.js` — OpenAPI 3.1 YAML completo.
  - Skills correspondientes `/meta-derive-types`, `/msw:gen`, `/openapi:gen`.

- **Protocolo append-only** en `docs/messages/`:
  - Estado del thread derivado de `in_reply_to`/`closes` (no mutable).
  - Cero merge conflicts entre agentes en paralelo.
  - `scripts/message-bus-validate.js` con `--strict` para CI.

- **Pendientes por scope** (`docs/pendientes/{backend,frontend,infra,roadmap}.md`):
  - Cada agente solo edita su archivo.
  - IDs `<scope>-N` secuenciales no-reciclables.

- **9 memorias frontend** pre-cargadas en `memory/`:
  tailwind-v4-silent-fail, tanstack-querykey-mismatch, safari-date-input,
  rhf-controller-vs-register, dark-mode-contrast, scrollable-region-focusable,
  mobile-drawer-vs-sidebar, msw-handler-drift, tanstack-query-cache-cross-resource.

- **CI ampliado**:
  - E2E matrix: chromium + firefox + mobile-chrome.
  - `a11y` job obligatorio (axe en light + dark).
  - `migrations-down-syntax` (cada .up tiene .down sintácticamente válido).
  - `metadata-snapshot-sync` falla si front olvida regenerar.
  - `npm audit` weekly (`.github/workflows/audit.yml`).
  - `release-please.yml` para bumps automáticos.
  - GH Actions a versiones nativas Node 24 (v6/v5/v7).

- **Backend DoD §F — Contratos canónicos del API** (CLAUDE.md):
  - F.1 Matriz HTTP 200/201/204/400/401/403/404/409/422/423/503.
  - F.2 Problem+JSON (title+detail no vacíos, type URI estable).
  - F.3 Envelope `{ data, next_cursor }` plano.
  - F.4 TIMESTAMP → ISO string, BOOLEANO_01 → 0|1 number.
  - F.5 Idempotencia `{ data, sin_cambio: true }`.
  - F.6 Versionado `/vN`: aditivos NO bumpean, breaking sí (90 días paralelo).

- **Migraciones up/down**:
  - `templates/migrate.js` con `up [N]`, `down N`, `status`.
  - Plantillas `NNNN_NOMBRE.up.sql` + `NNNN_NOMBRE.down.sql`.
  - CI valida sintaxis de cada down.

- **Secrets management 3-modos** (§13.3b): dotenv/aws-sm/vault.

- **i18n + multi-stack vision** (§13.3c):
  - Alcance corto: es-MX + i18next + UTF-8 everywhere.
  - Vision v3+: multi-stack templates (node/python/go/rust).
  - Capacidades non-Latín preparadas (RTL, CJK fonts, `\p{L}+`, Intl.Collator).

- **`tabla_uso` convention** (§13.3d): crud/lectura/interna/reporte.

- **Telemetría client-side + feature flags** (§13.3e):
  - Sentry para errores + web-vitals para UX + rrweb opcional.
  - Feature flags interno (BD) o externo (LaunchDarkly/GrowthBook).

- **Skills informativas y multi-agente**:
  - `/handoff <agente>` — mensaje fin de turno con contexto preciso.
  - `/status` — vista única del proyecto.
  - `/inbox` — re-check mensajes en sesión larga.
  - `/health-method` — verifica que el método está bien aplicado.
  - `/diff-meta` — qué cambió en metadata desde última mig.
  - `/coverage` — end-to-end por tabla.
  - `/seed-demo` — siembra datos demo del dominio.

- **Sub-agente `be-reviewer`** (par de `ui-reviewer`).

- **Identidad de agente en commits**:
  - `.claude/agents-config.json` + `apply-agent-identity.js`.
  - Trailer `Authored-Agent: <X>` en commits.

- **PR template** (`.github/pull_request_template.md`).

- **`templates/backend/{health.js, logger.js}`**: health endpoint canónico
  + pino logger con redacción.

- **ESLint rule cross-naming** `require-type-from-generated`
  (en `templates/eslint-rules/local-rules.js`).

- **`docs/MCP-recomendados.md`**: MCPs útiles (filesystem/github/postgres readonly).

- **`templates/bootstrap.sh`**: orden de inicialización completo en 7 pasos.

### Changed

- **`docs/messages/README.md`** reescrito para protocolo append-only (v1.1.0
  tenía `state:` mutable que generaba merge conflicts).
- **`message-bus.md`** actualizado a `--strict` con validación estructural.
- **`stack-pick` skill** pregunta por secrets management mode.
- **CI**: cambia de chromium-only a matrix multi-browser.
- **CI**: `cancel-in-progress` ahora es condicional (no en main).
- **CI**: drop `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` env var workaround.

### Removed

- `docs/PENDIENTES.md` único (reemplazado por `docs/pendientes/<scope>.md`).
- Headers per-doc con versión duplicada (la versión vive solo en git tag +
  CHANGELOG, regla §13.3).

### Breaking changes (relativo a v1.1.0)

Estos cambios afectan a proyectos que migran desde v1.1.0:

1. `docs/PENDIENTES.md` → `docs/pendientes/{backend,frontend,infra,roadmap}.md`.
   Migración: mover items del archivo único a los archivos por scope.
2. `docs/messages/` ahora append-only. Los `state:` mutables del v1.1.0
   se ignoran; el estado se deriva. No requiere migración manual de mensajes
   históricos.
3. CI workflow rediseñado. Si tu proyecto modificó `ci.yml` para v1.1.0,
   merge manual recomendado (ver `.github/workflows/ci.yml` v2.0).
4. GH Actions a versiones más recientes (v6/v5/v7) — verificar que el
   runner GitHub soporte (sí desde Sep 2026).

## [1.1.0] — 2026-05-10 — Convivencia multi-agente inicial

### Added
- docs/messages/ con frontmatter `state:` mutable
- docs/PENDIENTES.md SSOT único
- Backend DoD §5.1.2 + Tests DoD §5.1.3
- Pre-commit `orphan-migration-check`
- CI con `migrations-clean-apply` job
- Skill `/be` + agent `be-reviewer.md`
- 7 memorias técnicas pre-cargadas (4 backend + project/reference)

## [1.0.0] — 2026-05-08 — Método base

### Added
- Método de 5 fases dirigido por metadata.
- 9 niveles de metadata, 4 versiones acumulativas (V1-V4).
- 22 skills + ui-reviewer agent.
- CLAUDE.md v3.0 con 17 modos.
- Estructura `Dev/` backend + `Dev/frontend/` frontend + `Prod/`.
- 11 migraciones bootstrap obligatorias.
