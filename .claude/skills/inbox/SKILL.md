---
name: inbox
description: >
  Activar para re-chequear mensajes nuevos en `docs/messages/open/` durante una sesión
  larga. Equivalente a `message-bus` pero pensado para "el humano me interrumpió
  diciendo: llegó algo nuevo". Pull + listar mensajes nuevos desde el último check.
  Comandos de activación: /inbox
---

# SKILL — /inbox

Sirve para sesiones largas. `message-bus` solo corre al inicio; si el otro
agente o el humano agrega un mensaje a mitad de tu sesión, lo pierdes
hasta el próximo /init. `/inbox` cubre ese gap.

## Invocación

```
/inbox
```

Sin argumentos. Detecta `target_agent` desde la rama o pregunta al usuario.

## Procedimiento

### 1. Sync con remoto

```bash
# Sin merge (solo trae cambios al remote tracking branch):
git fetch origin main

# Listar archivos nuevos en docs/messages/open/ vs último check
LAST_CHECK_FILE=".claude/.last-inbox-check"
LAST_CHECK=$(cat "$LAST_CHECK_FILE" 2>/dev/null || echo "1970-01-01")

git log --since="$LAST_CHECK" --diff-filter=A --name-only \
  --pretty=format: origin/main -- 'docs/messages/open/' 2>/dev/null \
  | sort -u | grep -v '^$'
```

### 2. Para cada mensaje nuevo

Parsear frontmatter. Filtrar por `to: <target>` o `to: all`.

### 3. Sincronizar working tree (opcional)

Si el agente no está en una rama crítica, ofrecer `git pull` del main para
tener los mensajes localmente. Si está mid-PR, solo reportar las URLs/paths
GitHub.

### 4. Actualizar timestamp del último check

```bash
date -u +%Y-%m-%dT%H:%M:%SZ > "$LAST_CHECK_FILE"
```

Este file está en `.claude/` y se gitignorea (es per-agente).

## Output esperado

```
═══════════════════════════════════════
  INBOX — desde último check (3h)
═══════════════════════════════════════

  Mensajes nuevos para <target_agent>: 2

  📩 2026-05-11-1830-from-frontend-to-backend-bug-en-X.md
     [blocker] subject: Bug en endpoint X bloquea la pantalla Y
     edad: 30min — léelo con:
     cat docs/messages/open/2026-05-11-1830-...md

  📩 2026-05-11-1700-from-infra-to-all-mantenimiento.md
     [low-priority] subject: Ventana mantenimiento BD próximo sábado
     edad: 2h — informativo, no bloquea.

═══════════════════════════════════════
  Sin mensajes nuevos para los demás.
```

## Sin mensajes nuevos

```
Inbox vacío. Sin mensajes desde 2026-05-11T18:30:00Z (hace 30 min).
```

## Reglas

- Tiempo de ejecución < 3 segundos.
- NO mergea ni modifica branch. Solo `git fetch` + análisis.
- Mantener `.last-inbox-check` por agente; no compartirlo en git.
- Si el humano dice "no veo el mensaje aún", correr `/inbox` actualiza
  inmediatamente.
