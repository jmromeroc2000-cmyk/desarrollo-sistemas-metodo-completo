---
name: handoff
description: >
  Activar al FIN del turno de un agente para despertar al otro con contexto preciso.
  Detecta la rama actual y el último commit del agente saliente, genera un mensaje
  `docs/messages/open/<fecha>-from-<X>-to-<Y>-handoff-<tema>.md` con: branch, último SHA,
  archivos tocados, tests que pasaron, items abiertos de su scope, qué pendientes deja al
  otro agente. Asegura que ningún contexto se pierda entre sesiones.
  Comandos de activación: /handoff <agente-destino>
---

# SKILL — /handoff

Sirve para el momento "fin de turno": el agente activo termina su trabajo y
necesita pasarle la posta al otro agente con TODO el contexto que él
necesita para continuar sin re-descubrir.

## Invocación

```
/handoff <agente-destino>
```

Donde `<agente-destino>` ∈ `backend`, `frontend`, `infra`.

## Procedimiento

### 1. Detectar contexto del turno actual

```bash
git branch --show-current                       # rama activa
git log --oneline @{u}..HEAD 2>/dev/null \
  || git log --oneline -10                      # commits no pusheados, o últimos 10
git diff --name-only @{u}..HEAD 2>/dev/null \
  || git diff --name-only HEAD~5..HEAD          # archivos tocados
git status --short                              # estado pendiente
npm test --silent 2>&1 | tail -3                # baseline tests (si aplica)
```

### 2. Detectar quién soy

Por defecto: el agente que invocó `/handoff` se autodefine por la rama
actual:

- `feat/be-*` / `fix/be-*` / `chore/be-*` → `from: backend`
- `feat/fe-*` / `fix/fe-*` / `chore/fe-*` → `from: frontend`
- `chore/infra-*` / `chore/docs-*` → `from: infra` (o el rol más cercano)

Si la rama es ambigua, preguntar al usuario antes de generar el mensaje.

### 3. Listar mis pendientes abiertos

```bash
# Para backend agent:
cat docs/pendientes/backend.md | grep -E '^\s*-\s*\[ \]'
# Para frontend:
cat docs/pendientes/frontend.md | grep -E '^\s*-\s*\[ \]'
```

Identifica items que **dejas abiertos** y items que **bloquean al otro
agente** (referenciados en `frontend.md` con `Blocked-by: be-N`).

### 4. Generar el mensaje

Crear archivo `docs/messages/open/<YYYY-MM-DD-HHmm>-from-<X>-to-<Y>-handoff-<tema>.md`:

```yaml
---
from:    <yo>
to:      <agente-destino>
created: <ISO now>
subject: Handoff turno <fecha> — <resumen 1-línea>
labels:  [handoff]
---

# Handoff — <fecha>

## Lo que cerré este turno

- `<commit-sha>` <subject del commit>
  - Archivos: src/X/foo.js, migrations/0042_*.sql, tests/integration/foo.test.js
- ...

## Estado del workspace

- Rama actual: `<branch>`
- Tests: ✓ N/N verde | ✗ M fallando (detallar)
- Migraciones aplicadas a BD local hasta: NNNN_*.sql
- Workspace: limpio / N archivos staged / N untracked

## Lo que dejo abierto para ti (<destinatario>)

- `<scope>-N`: <descripción>. Razón por la que te toca: <...>
- ...

## Lo que dejo abierto pero NO te bloquea

- `<scope>-M`: <descripción>. Lo trabajo en el próximo turno mío.

## Decisiones pendientes (escalar al humano si vuelve)

- ...

## Próximos pasos sugeridos para ti

1. `git pull origin main` (los commits arriba ya están pusheados)
2. `/inbox` para confirmar este mensaje y revisar si hay más
3. Empezar por `<scope>-N` (más bloqueante)

— <yo> @ <ISO now>
```

### 5. Commit + push del mensaje

```bash
git add docs/messages/open/<archivo>.md
git commit -m "docs(messages): handoff from <X> to <Y>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin <rama-actual>
```

Si la rama no es `main`, el destinatario debe pullear esta rama o esperar
merge. Si el handoff aplica al estado de `main`, primero el agente saliente
debe mergear su PR.

## Output al usuario

Tras crear el mensaje:

```
✓ Handoff creado: docs/messages/open/<archivo>.md
✓ Commit + push: <sha>
→ El agente <destinatario> verá este mensaje en su próximo /inbox o /status.

Resumen del handoff:
  Branch:     <branch>
  Tests:      <estado>
  Cerré:      N items
  Dejo a ti:  M items bloqueantes
```

## Reglas

- Un handoff es siempre un mensaje NUEVO en `docs/messages/open/`, nunca
  edita uno existente.
- Si el agente saliente NO tiene commits pusheados en este turno, advertir
  pero permitir (puede ser handoff "no toqué nada, solo te dejo apuntes").
- El mensaje DEBE quedar pusheado antes de cerrar sesión. La skill recuerda
  esto si el push falla.
- Si el agente saliente cerró todos sus pendientes y no deja bloqueos para
  el otro, el handoff puede ser corto pero igual se genera para tener registro.
