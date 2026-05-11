---
name: status
description: >
  Activar (por el humano o cualquier agente) para ver dónde está el proyecto en una sola
  pantalla. Muestra: PRs abiertos, mensajes sin responder con edad, items en `docs/pendientes/`
  por owner, versión actual vs main, último commit por agente, CI status del último run.
  Sin esto, hay que abrir 5 herramientas para orientarse.
  Comandos de activación: /status
---

# SKILL — /status

Vista única de "dónde está el proyecto" en 3-5 secciones cortas.

## Invocación

```
/status
```

Sin argumentos. La skill detecta el proyecto desde `cwd` (busca `CLAUDE.md`
en árbol ascendente).

## Procedimiento

### 1. Estado de git

```bash
git fetch origin main 2>/dev/null
echo "Rama actual:  $(git branch --show-current)"
echo "Vs origin/main: $(git rev-list --count HEAD..origin/main) commits atrás"
git log --oneline -5
```

### 2. Versión del proyecto y método

```bash
# Versión del proyecto
node -p "require('./package.json').version" 2>/dev/null

# Versión del método (CLAUDE.md):
grep "^\*CLAUDE.md v" CLAUDE.md | head -1

# Versión de metadata (BD):
psql -tAc "SELECT version FROM metadata_versiones ORDER BY fecha DESC LIMIT 1" 2>/dev/null
```

### 3. PRs abiertos (GitHub)

```bash
gh pr list --state open --json number,title,headRefName,author,createdAt,statusCheckRollup \
  --jq '.[] | "#\(.number) \(.title) [\(.headRefName)] CI=\(.statusCheckRollup[0].state // "n/a")"'
```

### 4. Mensajes sin responder (docs/messages/open/)

Invocar `message-bus` para que destile esto. Si no disponible, listar
manual:

```bash
ls -1 docs/messages/open/*.md 2>/dev/null | while read f; do
  echo "$(stat -f '%Sm' -t '%Y-%m-%d %H:%M' "$f") $(basename "$f")"
done
```

### 5. Pendientes por scope

```bash
for scope in backend frontend infra; do
  active=$(grep -c '^\s*-\s*\[ \]' "docs/pendientes/${scope}.md" 2>/dev/null || echo 0)
  echo "  $scope: $active activos"
done
```

### 6. CI status del último run en main

```bash
gh run list --branch main --limit 1 \
  --json status,conclusion,name,headSha \
  --jq '.[] | "\(.headSha[0:7]) \(.name): \(.status)/\(.conclusion)"'
```

## Output esperado

```
═══════════════════════════════════════════════════════════════
  STATUS — <nombre-proyecto>
═══════════════════════════════════════════════════════════════

  Versiones
    proyecto:  v1.2.3
    método:    v2.0.0
    metadata:  v2.1.5 (en BD)

  Git
    rama:      feat/be-foo
    vs main:   2 commits atrás
    último:    abc1234 feat(be): bar (hace 3h)

  PRs abiertos (2)
    #45  feat(fe): nueva pantalla X    [feat/fe-pantalla-x]  CI=success
    #46  fix(be): bug en service Y     [fix/be-bug-y]        CI=running

  Mensajes abiertos (1)
    2026-05-11-1500-from-frontend-to-backend-revision.md  (edad: 3h)

  Pendientes
    backend:  3 activos
    frontend: 1 activo
    infra:    0 activos

  CI (último run en main)
    7ec7a6b feat(v1.4.9)...   CI: completed/success  hace 2h

═══════════════════════════════════════════════════════════════
```

## Reglas

- Salida ≤ 30 líneas. Si tiene más, comprimir (ej: top 5 PRs).
- Tiempo de ejecución < 5 segundos.
- Si un comando falla (ej: `gh` no instalado), reportar la sección como
  `no disponible (razón)` y seguir con las demás.
- NO modificar archivos. Solo lectura.
- Si detectas problemas (PR con CI rojo, mensaje sin responder > 3 días),
  marcarlo con ⚠️.
