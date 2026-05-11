---
name: Convención de namespace de ramas
description: feat/be-*, feat/fe-*, fix/be-*, fix/fe-*, chore/*, hotfix/*. El prefijo identifica al agente dueño y previene confusión cuando múltiples agentes trabajan en paralelo.
type: project
---

Convención fija (CLAUDE.md §13.3a):

```
feat/be-<descripcion>     # feature backend (Dev/src/, Dev/migrations/)
feat/fe-<descripcion>     # feature frontend (Dev/frontend/)
fix/be-<descripcion>      # bugfix backend
fix/fe-<descripcion>      # bugfix frontend
chore/be-<descripcion>    # mantenimiento backend (deps, CI)
chore/fe-<descripcion>    # mantenimiento frontend
chore/docs-<descripcion>  # solo docs/ — no dispara CI gracias a paths-ignore
hotfix/<descripcion>      # emergencia (con PR igual, fast-track review)
```

**Why:** Cuando dos agentes (backend, frontend) trabajan en paralelo, ver
una rama `feat/login` no indica quién es dueño y crea ambigüedad. El
prefijo lo deja claro a primera vista (en `git branch`, `gh pr list`, CI).

**How to apply:**

- Al crear rama: `git checkout -b feat/be-<scope>` (no `feat/<scope>`)
- En PRs: el título también puede empezar con `feat(be):` o `fix(fe):`
  (conventional commits — alimenta el changelog)
- Si tu hook renombra ramas: documentarlo en `.husky/post-checkout` para
  que el otro agente lo entienda.

**Branch protection en main:**
- require PR
- require CI green (backend + frontend + e2e + migrations-clean-apply)
- require 1 approval
- no force-push
- no delete

Sin protection, un push directo a main rompe el trabajo del otro agente.
