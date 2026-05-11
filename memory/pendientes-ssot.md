---
name: docs/pendientes/<scope>.md es la single source of truth de pendientes
description: 4 archivos por scope (backend, frontend, infra, roadmap). IDs <scope>-N estables. Solo el agente owner edita su archivo (cero merge conflicts).
type: reference
---

`docs/pendientes/<scope>.md` es el **único** lugar donde se registra
trabajo pendiente. v2.0.0 reemplazó el archivo único v1.1.0 (que causaba
merge conflicts en paralelo) por **4 archivos por scope**:

```
docs/pendientes/
├── README.md         ← protocolo
├── backend.md        ← solo backend agent edita
├── frontend.md       ← solo frontend agent edita
├── infra.md          ← infra/DevOps
└── roadmap.md        ← items diferidos, cualquiera edita (baja frecuencia)
```

**IDs**: `<scope>-<n>` (`be-1`, `fe-1`, `infra-1`) secuencial por scope,
**no reciclable**. Si se elimina antes de cerrar, el `<n>` queda quemado.

**Workflow**:

- Item nuevo → agregar a `<scope>.md` "Activos" ANTES de empezar.
- Cerrar → PR con `Closes <scope>-<n>` en commit footer; marcar `[x]` y
  mover a "Cerrados" del mismo archivo.
- Diferir → mover a `roadmap.md` con razón.
- Al release → "Cerrados" se mueven a `CHANGELOG.md` bajo la versión.

**Beneficios vs v1.1.0:**

- Cero merge conflicts (solo el owner toca su archivo).
- IDs locales por scope (be-1, fe-1 coexisten).
- Vista combinada via `/status` skill cuando el humano necesita panorama.
- Auditable: cada `[x]` se respalda con commit/PR.

**Cómo iniciar trabajo:**

```bash
# Backend agent al inicio de sesión:
cat docs/pendientes/backend.md | grep '\[ \]'
# → ver mis items activos
```

**Vista combinada (read-only):**

`/status` skill agrega los 4 archivos en una tabla con prioridad y owner,
ideal para el humano que quiere "dónde está el proyecto" sin abrir 4 docs.
