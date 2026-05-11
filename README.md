# Desarrollo de Sistemas — Método Completo

[![Release](https://img.shields.io/badge/release-v1.1.0-blue)](https://github.com/jmromeroc2000-cmyk/desarrollo-sistemas-metodo-completo/releases/tag/v1.1.0)

Método de creación de sistemas en **5 fases** dirigido por **metadata** y
preparado para **convivencia multi-agente** (backend y frontend trabajando
en paralelo).

La metadata se diseña antes de programar y es el contrato que backend y
frontend leen — nunca duplican. Los agentes se coordinan mediante un canal
de mensajes versionado en `docs/messages/` y un registro único de
pendientes en `docs/PENDIENTES.md`.

> **Última versión:** v1.1.0 (mayo 2026) — añade convivencia multi-agente,
> Backend DoD, CI con jobs por path-filter, branch protection, sub-agente
> `be-reviewer` y `message-bus`, skill `/be`, hook `orphan-migration-check`.

## ¿Qué hay aquí?

```
DesarrolloSistemasMetodoCompleto/
├── CLAUDE.md                  ← v3.1 — método completo
│   ├── §5.1.1 UI DoD          ← Definition of Done frontend
│   ├── §5.1.2 Backend DoD     ← Definition of Done backend (NUEVO v1.1.0)
│   ├── §5.1.3 Tests DoD       ← order/state-independent (NUEVO v1.1.0)
│   ├── §13.3   Versionado     ← una sola fuente: git tag + CHANGELOG (NUEVO)
│   ├── §13.3a  Ramas          ← feat/be-*, feat/fe-*, ... (NUEVO)
│   ├── §13.3+  Branch protect ← reglas en main (NUEVO)
│   └── §18     Convivencia    ← protocolo multi-agente (NUEVO)
├── README.md
├── .github/workflows/ci.yml   ← CI con path-filter por job (NUEVO)
├── .husky/pre-commit          ← compuesto: orphan-check + lint-staged + preflight
├── scripts/
│   └── orphan-migration-check.sh  ← bloquea regresión silenciosa (NUEVO)
├── docs/
│   ├── PENDIENTES.md          ← SSOT del trabajo pendiente (NUEVO)
│   ├── CHANGELOG.md           ← generado desde conventional commits (NUEVO)
│   └── messages/
│       ├── README.md          ← protocolo + frontmatter schema
│       ├── open/              ← mensajes activos
│       └── archived/          ← respondidos/cerrados
├── memory/                     ← gotchas técnicos pre-cargados (NUEVO)
│   ├── MEMORY.md
│   └── (7 entradas)
└── .claude/
    ├── settings.local.json
    ├── agents/
    │   ├── ui-reviewer.md
    │   ├── be-reviewer.md     ← (NUEVO) revisor backend pre-PR
    │   └── message-bus.md     ← (NUEVO) destila docs/messages/open/
    └── skills/
        ├── README.md
        ├── ui/SKILL.md
        ├── be/SKILL.md        ← (NUEVO) modo disciplinado backend
        └── (resto de skills)
```

## Las 5 fases

```
FASE 1 — METADATA           /meta   → diseñar tablas, campos, procesos en BD antes de programar
FASE 2 — ARQUITECTURA       /arq    → derivar capas y decisiones desde la metadata
FASE 3 — STACK              /dev    → declarar componentes_sistema con versiones
FASE 4 — INSTALACIÓN        /dev    → bootstrap del entorno desde el stack
FASE 5 — PROGRAMACIÓN       /be /ui → backend y frontend en paralelo, ambos leyendo metadata
```

## Las 4 versiones (acumulativas)

| Versión | Niveles incluidos | Capacidad |
|---------|-------------------|-----------|
| V1 | 1 + 2 | Estructural + operacional (mínimo viable) |
| V2 | + 3 + 4 | + Capas administrativas + resiliencia |
| V3 | + 5 + 6 + 7 | + Esquemas BD + cache + históricos |
| V4 | + 8 + 9 | + CDN/edge + observabilidad avanzada |

## Lo nuevo en v1.1.0 — convivencia multi-agente

Tras desarrollar SistemaINV con backend y frontend agents en paralelo
(sesión v1.4.0 → v1.4.9) identifiqué 8 mejoras concretas que ahora viven en
esta plantilla:

| Componente | Qué resuelve |
|------------|-------------|
| `docs/messages/` con frontmatter | Mensajes inter-agente estructurados (vs `docs/3X-...md` sueltos) |
| `docs/PENDIENTES.md` SSOT | Trabajo pendiente en 1 archivo (vs 4 lugares) |
| Branch namespace `feat/be-* feat/fe-*` | Dueño visible a primera vista |
| Branch protection en `main` | Bloquea push directo, requires CI |
| Backend DoD §5.1.2 | Checklist enforced para backend (paralelo al UI DoD) |
| Tests order-independent §5.1.3 | Count-before/after en vez de `ts > snapshot` |
| Pre-commit `orphan-migration-check` | Bloquea regresión silenciosa de mig untracked + service modificado |
| CI con path-filter por job | Solo corre lo que cambió; docs no disparan CI |
| `migrations-clean-apply` CI job | Valida fresh DB → migrate (evita "verde por casualidad") |
| Skill `/be` + agent `be-reviewer` | Modo disciplinado backend (espejo de `/ui` + `ui-reviewer`) |
| Agent `message-bus` | Destila mensajes abiertos a tabla priorizada al iniciar sesión |
| `memory/` con 7 gotchas | μs vs ms, double-INSERT, session_replication_role, SET LOCAL, etc. |

Ver detalle completo en `CLAUDE.md §18` (Convivencia multi-agente).

## Cómo usar este método en un proyecto nuevo

```bash
# 1. Copiar la base
cp -R DesarrolloSistemasMetodoCompleto/* nuevo-proyecto/
cp -R DesarrolloSistemasMetodoCompleto/.claude nuevo-proyecto/
cp -R DesarrolloSistemasMetodoCompleto/.husky nuevo-proyecto/
cp -R DesarrolloSistemasMetodoCompleto/.github nuevo-proyecto/

# 2. Iniciar Claude Code
cd nuevo-proyecto/
claude

# 3. Dentro de Claude — flujo de las 5 fases
/init-proyecto       # bootstrap: 11 migraciones + estructura
/meta                # Fase 1: diseña la metadata del dominio
/meta-validate       # verifica cobertura 100%
/arq-derive          # Fase 2: propone arquitectura
/stack-pick          # Fase 3: elige stack
/install-from-stack  # Fase 4: instala
/back-scaffold-from-meta + /front-scaffold-from-meta  # Fase 5

# 4. Setup en GitHub
# Branch protection rules en `main` (Settings → Branches):
#   ✓ Require PR
#   ✓ Require status checks: backend, frontend, e2e, migrations-clean-apply
#   ✓ No force push, no delete
```

Detalle completo del método y manual de uso en
[`CLAUDE.md`](./CLAUDE.md) §14-18.

## Convivencia con múltiples agentes

Cuando empiezas trabajo en una sesión:

```bash
# 1. Sync con remoto
git fetch origin main && git pull

# 2. Leer mensajes abiertos del otro agente
# Opción A — manual:
ls docs/messages/open/
# Opción B — usar sub-agente (recomendado):
# Invocar message-bus desde Claude: "lee mis mensajes abiertos"

# 3. Confirmar pendientes
cat docs/PENDIENTES.md

# 4. Activar el modo disciplinado según la tarea
# /be   → backend
# /ui   → frontend
# /meta → metadata
# /sis  → director del ciclo de vida
```

## Origen

Método extraído del proyecto SistemaINV (sistema de inventarios) tras
desarrollarlo a través de **17+ migraciones** que establecieron progresivamente
la convención de metadata y las prácticas de convivencia multi-agente.

**Releases:**
- v1.0.0 (mayo 2026) — Método V1 base, extraído de SistemaINV v1.4.0
- v1.1.0 (mayo 2026) — **Convivencia multi-agente, Backend DoD, CI optimizado**
  (extraído de la sesión v1.4.0 → v1.4.9 con frontend agent activo)
