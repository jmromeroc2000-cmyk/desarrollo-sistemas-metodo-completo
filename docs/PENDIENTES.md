# Pendientes activos

> **Single source of truth** del trabajo pendiente. Reemplaza `[TODO v1.X.X]`
> sueltos en código, mensajes y roadmap. Cada commit que cierra un item debe
> agregar `Closes <id>` al footer.
>
> Estructura: una sección por scope (Backend, Frontend, Infra, Roadmap futuro).
> IDs son `<scope>-N` estables (no se reciclan al cerrar).

---

## Backend

<!-- Items abiertos. Quitar al cerrar y mover trazabilidad a docs/CHANGELOG.md -->

_(ninguno todavía)_

## Frontend

_(ninguno todavía)_

## Infra / DevOps

_(ninguno todavía)_

## Roadmap futuro (diferidos)

Items que se difirieron conscientemente para una versión futura. No tienen
ETA cercana pero conviene registrarlos para no perderlos.

_(ninguno todavía)_

---

## Plantilla para nuevos items

```markdown
- [ ] **be-3**: descripción breve y específica.
      Owner: backend. Prio: alta | media | baja. ETA: v1.5.0 (opcional).
      Blocked-by: be-1 (opcional). Referencia: docs/messages/archived/X.md (opcional).
```

## Reglas

- ID `<scope>-<n>` (be-, fe-, infra-) — estable, no reciclar.
- Un item nuevo se agrega ANTES de empezar el trabajo, no después.
- Marcar `[x]` solo cuando hay PR mergeado que lo cierra (commit con `Closes <id>`).
- Items cerrados se MUEVEN a `docs/CHANGELOG.md` con la versión correspondiente.
- Roadmap futuro: items diferidos conscientemente; no se borran, solo se promueven.
- Si descubres que un item ya no aplica: marcar `[~]` (tachado) con explicación.
