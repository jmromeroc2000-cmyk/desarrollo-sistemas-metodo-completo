# Pendientes — registro por scope

> v2.0.0 — Reemplaza el `docs/PENDIENTES.md` único (v1.1.0).
> Razón: archivo único causaba conflictos cuando dos agentes editaban en
> paralelo. Por scope, **cero conflicts** entre backend y frontend.

## Estructura

```
docs/pendientes/
├── README.md         ← este archivo
├── backend.md        ← solo el backend agent edita
├── frontend.md       ← solo el frontend agent edita
├── infra.md          ← infra/DevOps (puede ser humano o agente)
└── roadmap.md        ← cualquiera, baja frecuencia, items diferidos
```

## Formato de cada archivo

```markdown
# Pendientes — <scope>

## Activos

- [ ] **<scope>-<n>**: descripción breve y específica.
      Prio: alta | media | baja. ETA: v<X.Y.Z> (opcional).
      Blocked-by: <scope>-<m> (opcional). Ref: docs/messages/archived/X.md (opcional).

## Cerrados (mover a CHANGELOG al release)

(vacío entre releases)
```

## IDs

- `<scope>-<n>` donde `<scope>` ∈ {`be`, `fe`, `infra`}.
- `<n>` es contador secuencial por scope, **NUNCA se recicla** al cerrar
  un item. Si se elimina antes de cerrar, el `<n>` queda quemado.
- IDs son referenciables desde commits: `Closes be-3`, `Refs fe-1`.

## Workflow

### Agregar item

1. Identificar scope correcto: ¿lo cierra backend, frontend o infra?
2. Editar `docs/pendientes/<scope>.md` agregando un item en "Activos".
3. ID = siguiente número secuencial.
4. Commit: `docs(pendientes): agrega <scope>-<n> — <descripción corta>`.

### Cerrar item

1. PR que cierra el item incluye `Closes <scope>-<n>` en el footer del commit.
2. Marcar `[x]` en `pendientes/<scope>.md`.
3. Mover el item de "Activos" a "Cerrados".
4. Al siguiente release, todos los "Cerrados" se mueven a `docs/CHANGELOG.md`
   bajo la versión correspondiente.

### Diferir item (a roadmap)

1. Si decides que el item no entra en esta versión ni en la siguiente:
   mover de `<scope>.md` a `roadmap.md`.
2. Conservar el ID original.
3. Commit: `docs(pendientes): difiere <scope>-<n> a roadmap — <razón>`.

## Reglas

- **Solo el agente owner edita su archivo.** Backend edita `backend.md`,
  frontend edita `frontend.md`. Esto elimina conflicts.
- Si un item realmente cae en dos scopes (raro): elige uno como primary
  owner; el otro lo trackea como reference en su propio archivo.
- Item nuevo se agrega ANTES de empezar el trabajo, no después.
- Marcar `[x]` SOLO con PR mergeado que tiene `Closes <id>` en commit.
- Si descubres que un item ya no aplica: marcar `[~]` (tachado) + razón;
  no eliminar.

## Vista combinada (read-only)

El sub-agente `status` (`/status`) genera tabla agregada con items abiertos
de los 4 archivos, ordenados por prio y owner. El humano lo usa para
"dónde está el proyecto".
