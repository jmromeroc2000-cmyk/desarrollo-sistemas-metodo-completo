# GitHub Actions workflows

| Workflow | Disparador | Bloquea merge | Cobertura |
|----------|-----------|---------------|-----------|
| **ci.yml** | push/PR a main | ✅ | Backend único DBMS (PG default) + Frontend + E2E |
| **ci-matrix.yml** | push/PR a main | ✅ | Backend en 3 DBMS (PG + MySQL + SQL Server) + rehearsal up/down + Spanner emulator (opt) |
| **ci-matrix-opt.yml** | workflow_dispatch o label | ❌ | Oracle + DB2 (containers comerciales, requieren secrets) |
| **audit.yml** | weekly | ❌ | `npm audit` warning |
| **release-please.yml** | push a main | ❌ | Auto-bump SemVer desde conventional commits |

## ci-matrix.yml — los 3 DBMS obligatorios

Job `backend-matrix` con strategy matrix:

- **postgres**: `postgres:16-alpine` (gratis, oficial)
- **mysql**: `mysql:8` (gratis, oficial)
- **sqlserver**: `mcr.microsoft.com/mssql/server:2022-latest` (Microsoft Developer Edition gratis para CI)

Cada DBMS:
1. Levanta container con health check
2. Aplica `migrate.js up` (todas las migraciones bootstrap + dominio)
3. Aplica `migrate.js triggers` (Capa 2 nativa por DBMS)
4. Corre `npm test` (suite con tests portables)

Job `migration-rehearsal` valida reversibilidad:
- `migrate up` → `migrate down 0` → `migrate up`
- Si una migración no es reversible cleanly, el job falla.

## ci-matrix-opt.yml — Oracle + DB2

Estos DBMS requieren containers comerciales:
- **Oracle**: `container-registry.oracle.com/database/free:latest` (gratis pero requiere cuenta de Oracle)
- **DB2**: `icr.io/db2_community/db2:latest` (gratis pero requiere cuenta IBM Cloud)

Por esta razón, NO van en el flujo automático. Se disparan:
- Manual: `workflow_dispatch` con dropdown de qué DBMS probar
- Label en PR: `test-oracle` o `test-db2` (cuando el cambio afecta el adapter respectivo)

**Configuración:**
Requiere secrets en el repo:
- `ORACLE_REGISTRY_USER`, `ORACLE_REGISTRY_PASS` (Oracle Container Registry)
- `IBM_REGISTRY_USER`, `IBM_REGISTRY_PASS` (IBM Cloud Container Registry)

Si no están configurados, los jobs se saltan con warning.

## Spanner emulator

En `ci-matrix.yml` hay un job opcional `spanner-emulator` que:
- Usa `gcr.io/cloud-spanner-emulator/emulator` (gratis, oficial Google)
- NO requiere credenciales GCP
- Crea instance + database en el emulator vía REST API
- Aplica migraciones y tests (Spanner NO aplica triggers — solo Capa 1)

Se dispara solo cuando:
- `workflow_dispatch` manual
- PR modifica archivos con "spanner" en el path

## Filosofía: cobertura por defecto razonable

El método NO obliga a probar los 6 DBMS en cada PR — eso saturaría minutos
de Actions y haría merge lento. La regla práctica:

- **Cada PR**: ci-matrix.yml (3 DBMS gratis y rápidos).
- **Antes de release**: ci-matrix-opt.yml dispatched + Spanner emulator.
- **Bug específico**: agregar label correspondiente al PR para correr la
  matriz extendida sin esperar release.

## Skip e2e en cambios irrelevantes

Si tu PR solo toca docs o markdown, el filter `paths-ignore` evita disparar
los workflows. Para casos especiales (cambios al own ci.yml), el flag
`[skip e2e]` en el commit message también funciona.
