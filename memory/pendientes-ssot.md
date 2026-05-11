---
name: docs/PENDIENTES.md es la single source of truth de pendientes
description: Único registro de trabajo pendiente. IDs <scope>-N estables. Cada commit que cierra un item agrega `Closes <id>` al footer.
type: reference
---

`docs/PENDIENTES.md` es el **único** lugar donde se registra trabajo
pendiente. Sustituye los `[TODO v1.X.X]` esparcidos en código, en mensajes
y en roadmap.

**Estructura:**

```markdown
# Pendientes activos

## Backend
- [ ] **be-1**: descripción. Owner: backend. Prio: alta. ETA: v1.5.0.

## Frontend
- [ ] **fe-1**: descripción. Blocked-by: be-1.

## Infra / DevOps
- [ ] **infra-1**: descripción.

# Pendientes diferidos
- [ ] Item para roadmap futuro.
```

**Reglas:**

- IDs `<scope>-N` (be-, fe-, infra-) — estables, no reciclar.
- Item nuevo se agrega ANTES de empezar el trabajo.
- Marcar `[x]` solo cuando hay PR mergeado con `Closes <id>` en commit.
- Al cerrar, MOVER el item a `docs/CHANGELOG.md` con la versión.
- Roadmap futuro: items diferidos conscientemente; no se borran.

**Beneficios:**

- Vista única del trabajo (vs 4 lugares: memoria, commits, mensajes, roadmap).
- Refresca al iniciar sesión: 1 archivo en vez de grep en 10.
- Auditable: cada `[x]` se respalda con commit/PR.
- Coordinable: el otro agente ve el state de tu trabajo antes de empezar
  el suyo.
