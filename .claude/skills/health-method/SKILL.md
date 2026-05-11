---
name: health-method
description: >
  Activar para verificar que el método está correctamente aplicado en el proyecto.
  Checks: docs/messages/ presente, docs/pendientes/ por scope, hooks instalados,
  CI workflows válidos, skills funcionales, branch protection (vía gh API). Muestra
  reglas del método que están "en verde" vs "en rojo". Útil al onboardear sistema
  o auditar drift del método.
  Comandos de activación: /health-method
---

# SKILL — Salud de aplicación del método en el proyecto

Lista TODAS las reglas que el método declara y verifica cuáles están
aplicadas en el proyecto actual.

## Invocación

```
/health-method
```

## Procedimiento

Para cada categoría, verifica condiciones concretas:

### 1. Estructura de directorios

```bash
[ -f CLAUDE.md ] && echo "✓" || echo "✗ Falta CLAUDE.md"
[ -d docs/messages/open ] && [ -d docs/messages/archived ] && echo "✓" || echo "✗ Falta docs/messages/"
[ -f docs/pendientes/backend.md ] && [ -f docs/pendientes/frontend.md ] && echo "✓" || echo "✗ Falta docs/pendientes/<scope>.md"
[ -d memory ] && [ -f memory/MEMORY.md ] && echo "✓" || echo "✗ Falta memory/"
[ -d .claude/skills ] && [ -d .claude/agents ] && echo "✓" || echo "✗ Falta .claude/"
[ -f .github/workflows/ci.yml ] && echo "✓" || echo "✗ Falta CI workflow"
[ -f .github/pull_request_template.md ] && echo "✓" || echo "✗ Falta PR template"
[ -f .husky/pre-commit ] && echo "✓" || echo "✗ Falta pre-commit hook"
[ -f scripts/orphan-migration-check.sh ] && echo "✓" || echo "✗ Falta orphan-migration-check"
```

### 2. Branch protection en GitHub

```bash
gh api repos/:owner/:repo/branches/main/protection 2>&1 | jq '
  if .required_pull_request_reviews then "✓" else "✗ Sin require PR" end,
  if .required_status_checks then "✓ Checks: " + (.required_status_checks.contexts | join(",")) else "✗ Sin status checks required" end,
  if .allow_force_pushes.enabled == false then "✓ No force push" else "✗ Force push allowed" end
'
```

### 3. Scripts ejecutables

```bash
for s in scripts/*.sh scripts/*.js .husky/pre-commit; do
  [ -x "$s" ] && echo "✓ $s" || echo "✗ $s no ejecutable"
done
```

### 4. Skills registradas

```bash
ls .claude/skills/*/SKILL.md | wc -l  # debería ser ≥30 en v2.0
```

### 5. Codegen sincronizado

```bash
cd Dev/frontend
npm run meta:types > /dev/null 2>&1
git diff --exit-code src/api/types/_generated.ts && echo "✓ TS types sync" || echo "✗ TS types stale — corre npm run meta:types"

npm run msw:gen > /dev/null 2>&1
git diff --exit-code src/test/msw/_generated.ts && echo "✓ MSW sync" || echo "✗ MSW stale"
```

### 6. Mensajes y pendientes

```bash
node scripts/message-bus-validate.js --strict && echo "✓ Mensajes válidos" || echo "✗ Anomalías"

# Pendientes activos por scope
for scope in backend frontend infra; do
  N=$(grep -c '\[ \]' docs/pendientes/$scope.md 2>/dev/null || echo 0)
  echo "  $scope: $N activos"
done
```

## Output esperado

```
═══════════════════════════════════════════════════════
  HEALTH MÉTODO — DesarrolloSistemasMetodoCompleto v2.0.0
═══════════════════════════════════════════════════════

  Estructura
    ✓ CLAUDE.md
    ✓ docs/messages/{open,archived}/
    ✓ docs/pendientes/{backend,frontend,infra,roadmap}.md
    ✓ memory/MEMORY.md + 15 entradas
    ✓ .claude/{skills,agents}/
    ✓ .github/workflows/ci.yml
    ✓ .github/pull_request_template.md
    ✓ .husky/pre-commit
    ✓ scripts/orphan-migration-check.sh

  Branch protection (main)
    ✓ require PR
    ✓ checks: backend, frontend, e2e, migrations-clean-apply
    ✓ no force push

  Scripts ejecutables
    ✓ scripts/orphan-migration-check.sh
    ✓ scripts/message-bus-validate.js
    ✓ .husky/pre-commit

  Skills (36 registradas)
    ✓ /be, /ui, /handoff, /status, /inbox
    ✓ /meta-derive-types, /msw:gen, /openapi:gen
    ✓ /diff-meta, /coverage, /health-method
    ...

  Codegen sincronizado
    ✓ TS types
    ✓ MSW handlers
    ✓ OpenAPI

  Convivencia
    ✓ Mensajes estructura válida (--strict pasa)
    Pendientes activos:
      backend:  3
      frontend: 1
      infra:    0

  RESULTADO: 100% reglas en verde. Método correctamente aplicado.

═══════════════════════════════════════════════════════
```

Si algo falla:

```
  ✗ Falta scripts/orphan-migration-check.sh
    Fix: cp <metodo>/scripts/orphan-migration-check.sh scripts/

  ✗ TS types stale — corre npm run meta:types

  Resultado: 14/16 reglas en verde. Aplicar fixes arriba.
```

## Reglas

- Read-only.
- < 10 segundos.
- Si una capa no aplica al sistema, omitirla (no falla).
- Exit 0 siempre — solo reporta. Para CI usar `--strict` que sí falla.
