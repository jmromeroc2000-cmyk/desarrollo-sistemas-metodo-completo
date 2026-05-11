# Desarrollo de Sistemas — Método Completo

[![Release](https://img.shields.io/badge/release-v2.0.0-blue)](https://github.com/jmromeroc2000-cmyk/desarrollo-sistemas-metodo-completo/releases/tag/v2.0.0)

Método de creación de sistemas en **5 fases** dirigido por **metadata** y
preparado para **convivencia multi-agente** (backend, frontend, infra
trabajando en paralelo).

La metadata se diseña antes de programar y es el contrato que backend y
frontend leen — nunca duplican. **Los tipos TypeScript del frontend, los
handlers MSW de tests y el OpenAPI completo se auto-generan desde la
metadata.** Los agentes se coordinan mediante mensajes append-only en
`docs/messages/` y un registro único de pendientes por scope en
`docs/pendientes/`.

> **Última versión:** v2.0.0 (mayo 2026) — codegen funcional TS+MSW+OpenAPI
> desde metadata, protocolo de mensajes append-only, multi-browser E2E,
> rollback up/down de migraciones, contratos canónicos del API (matriz HTTP,
> Problem+JSON, paginación, Date/ISO, 0|1, idempotencia), secrets management
> multi-modo, i18n con visión multi-stack, 16 memorias técnicas pre-cargadas.

## Estructura del método

```
DesarrolloSistemasMetodoCompleto/
├── CLAUDE.md                  ← v3.2 — método completo + 17 modos
│   ├── §5.1.1 UI DoD          ← Frontend Definition of Done
│   ├── §5.1.2 Backend DoD     ← incluye §F contratos canónicos del API
│   ├── §5.1.3 Tests DoD       ← order/state-independent
│   ├── §13.3*  Versionado + ramas + secrets + i18n + telemetría + tabla_uso
│   └── §18     Convivencia multi-agente APPEND-ONLY
├── README.md
├── package.json + release-please-config.json + .release-please-manifest.json
├── .github/
│   ├── workflows/{ci,audit,release-please}.yml
│   └── pull_request_template.md
├── .husky/pre-commit          ← orphan-migration-check + lint-staged
├── scripts/
│   ├── orphan-migration-check.sh
│   └── message-bus-validate.js
├── docs/
│   ├── CHANGELOG.md           ← generado por release-please
│   ├── MCP-recomendados.md
│   ├── pendientes/{backend,frontend,infra,roadmap}.md  ← SSOT por scope
│   └── messages/{open,archived}/  ← canal append-only
├── memory/                     ← 16 entries pre-cargadas
├── templates/
│   ├── bootstrap.sh
│   ├── migrate.js             ← runner up/down/status
│   ├── migrations/{NNNN.up.sql, NNNN.down.sql}
│   ├── codegen/               ← FUNCIONALES (no stubs):
│   │   ├── meta-derive-types.js     ← genera TS interfaces
│   │   ├── front-msw-from-meta.js   ← genera MSW handlers
│   │   └── meta-derive-openapi.js   ← genera OpenAPI 3.1
│   ├── backend/{health.js, logger.js}
│   └── eslint-rules/local-rules.js
└── .claude/
    ├── agents-config.json + apply-agent-identity.js
    ├── agents/{ui-reviewer, be-reviewer, message-bus}.md
    └── skills/ (40+ skills)
```

## Las 5 fases

```
FASE 1 — METADATA           /meta   → tablas, campos, procesos en BD
FASE 2 — ARQUITECTURA       /arq    → derivar capas desde metadata
FASE 3 — STACK              /dev    → componentes_sistema con versiones
FASE 4 — INSTALACIÓN        /dev    → bootstrap desde stack
FASE 5 — PROGRAMACIÓN       /be /ui → backend + frontend leyendo metadata
```

## Las 4 versiones (acumulativas)

| Versión | Niveles | Capacidad |
|---------|---------|-----------|
| V1 | 1 + 2 | Estructural + operacional |
| V2 | + 3 + 4 | + Autorización fina + resiliencia |
| V3 | + 5 + 6 + 7 | + Multi-schema BD + cache + históricos |
| V4 | + 8 + 9 | + CDN/edge + observabilidad avanzada |

## Lo nuevo en v2.0.0

Salto mayor sobre v1.1.0. Incorpora 30+ items revisados por el frontend agent
tras correr SistemaINV en producción (v1.4.0 → v1.4.9).

### Codegen FUNCIONAL desde metadata

Scripts ejecutables (no stubs):

- **`meta-derive-types`**: campos_sistema → TS interfaces (`_generated.ts`).
- **`front-msw-from-meta`**: tablas CRUD → MSW v2 handlers con fixtures
  determinísticos.
- **`meta-derive-openapi`**: → OpenAPI 3.1 YAML completo.

CI job `metadata-snapshot-sync` corre los 3 + `git diff --exit-code` y bloquea
PRs con drift.

### Convivencia multi-agente robusta

- **Mensajes append-only** en `docs/messages/` — estado derivado, cero
  merge conflicts.
- **Pendientes split por scope** (`backend.md`/`frontend.md`/...).
- **Identidad de agente** en commits via hook.
- **Skills nuevas**: `/handoff`, `/status`, `/inbox`, `/health-method`,
  `/diff-meta`, `/coverage`, `/seed-demo`.
- **Sub-agente** `be-reviewer` (par de `ui-reviewer`) + `message-bus` v2
  con `--strict`.

### CI completo

- **E2E matrix** chromium + firefox + mobile-chrome.
- **a11y** obligatorio (axe en light + dark).
- **`migrations-clean-apply`** + **`migrations-down-syntax`** (cada up tiene down).
- **`metadata-snapshot-sync`** falla si frontend olvida regenerar.
- **`npm audit`** weekly con auto-issue.
- **Path-filter por job** + paths-ignore para docs.
- **GH Actions @v6/v5/v7** (Node 24 nativo).

### Backend DoD §F — contratos canónicos del API

- **F.1 Matriz HTTP** 200/201/204/400/401/403/404/409/422/423/503.
- **F.2 Problem+JSON** (title+detail no vacíos, type URI estable).
- **F.3 Envelope** `{ data, next_cursor }` plano.
- **F.4 Serialización**: TIMESTAMP → ISO string, BOOLEANO_01 → 0|1 number.
- **F.5 Idempotencia** `{ data, sin_cambio: true }`.
- **F.6 Versionado** `/vN`: aditivos NO bumpean, breaking sí (90 días paralelo).

### Migraciones up/down

`templates/migrate.js` soporta `up [N]`, `down N`, `status`. CI valida que
cada .up tiene .down sintácticamente válido.

### Decisiones políticas tomadas

- **Rollback**: estándar de industria (up/down).
- **API versioning**: aditivos NO bumpean.
- **Secrets**: 3 modos (dotenv/aws-sm/vault).
- **i18n**: corto v2.0 (es-MX + i18next), multi-stack v3+, non-Latín latente.

### 16 memorias técnicas pre-cargadas

**Backend gotchas:** pg-timestamp-precision, trigger-double-insert,
session-replication-role, set-local-transaction.

**Frontend gotchas:** tailwind-v4-silent-fail, tanstack-querykey-mismatch,
safari-date-input, rhf-controller-vs-register, dark-mode-contrast,
scrollable-region-focusable, mobile-drawer-vs-sidebar, msw-handler-drift,
tanstack-query-cache-cross-resource.

**Convenciones del proyecto:** branch-namespace, migrations-vs-service,
protocolo-mensajes, pendientes-ssot.

## Cómo usar en un proyecto nuevo

```bash
# 1. Copiar el árbol completo
cp -R DesarrolloSistemasMetodoCompleto/* nuevo-proyecto/
cp -R DesarrolloSistemasMetodoCompleto/.claude   nuevo-proyecto/
cp -R DesarrolloSistemasMetodoCompleto/.github   nuevo-proyecto/
cp -R DesarrolloSistemasMetodoCompleto/.husky    nuevo-proyecto/

cd nuevo-proyecto/

# 2. Bootstrap
bash templates/bootstrap.sh

# 3. En GitHub Settings → Branches:
#    Require PR + Status checks (backend, frontend, e2e, migrations-clean-apply,
#    migrations-down-syntax, metadata-snapshot-sync, a11y) + No force push

# 4. Iniciar Claude Code y arrancar Fase 1
claude
> /sis      # diagnóstico
> /meta     # diseña metadata del dominio
> /arq      # arquitectura
> /stack-pick
> /install-from-stack
> /back-scaffold-from-meta + /front-scaffold-from-meta
```

## Multi-agente — onboarding

Cada agente al iniciar sesión:

```bash
node .claude/apply-agent-identity.js <backend|frontend|infra>

claude
> /status                  # vista única del proyecto
> message-bus              # mensajes filtrados para mí
> /be   (o /ui)            # modo disciplinado
# ... trabajo ...
> /handoff <otro-agente>   # deja contexto preciso al cerrar sesión
```

## Origen

Método extraído de SistemaINV (v1.4.0 → v1.4.9, mayo 2026) y refinado vía
revisión crítica del frontend agent. Cada decisión del método tiene un bug
real que la motivó.

**Releases:**
- v1.0.0 — Método V1 base
- v1.1.0 — Convivencia multi-agente (mutable state)
- **v2.0.0** — Append-only + codegen funcional + multi-browser CI +
  contratos canónicos del API + rollback up/down + secrets multi-modo +
  i18n + 16 memorias pre-cargadas
