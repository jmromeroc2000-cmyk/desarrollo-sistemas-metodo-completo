---
name: coverage
description: >
  Activar para medir cobertura end-to-end de cada tabla en tablas_sistema: ¿tiene endpoint
  REST? ¿tests de integración? ¿módulo backend (queries+service+controller+routes)?
  ¿página frontend (si tabla_uso=crud)? ¿entrada en docs? Reporta gaps con priorización.
  Comandos de activación: /coverage
---

# SKILL — Cobertura end-to-end del sistema

Para cada tabla en `tablas_sistema`, verifica que tiene SU ECOSISTEMA completo:

| Capa | Qué se verifica | Cómo |
|------|-----------------|------|
| Migración | Tabla existe en BD + fila en `tablas_sistema` + filas en `campos_sistema` | `psql \d <tabla>` + SELECT |
| Backend module | `Dev/src/modules/<X>/{routes,controller,service,queries}.js` | `ls` |
| Backend tests | `Dev/tests/integration/<X>/<X>.test.js` | `ls` |
| Frontend (si `generar_ui_crud=1`) | `Dev/frontend/src/pages/<X>/` | `ls` |
| Frontend types (si CRUD) | `Tabla` interface en `_generated.ts` | grep |
| Frontend MSW (si CRUD) | `handlers<Tabla>` en `_generated.ts` | grep |
| Docs | Referencia en `docs/05-contratos-api.md` | grep |
| OpenAPI | Path `/v1/<recurso>` en `openapi.yaml` | grep |

## Invocación

```
/coverage
```

## Procedimiento

```bash
# Listar tablas relevantes
TABLAS=$(psql -tAc "SELECT nombre_tabla, generar_ui_crud, tabla_uso FROM tablas_sistema WHERE nombre_tabla NOT LIKE '\\_%' ORDER BY nombre_tabla")

# Para cada tabla, verificar las 8 capas:
for tabla in $TABLAS; do
  # ... checks ...
done
```

## Output esperado

```
═══════════════════════════════════════════════════════
  COBERTURA — Sistema (13 tablas, 109 campos)
═══════════════════════════════════════════════════════

  | Tabla            | Mig | Mod | Tst | UI  | TS  | MSW | Doc | API |
  |------------------|-----|-----|-----|-----|-----|-----|-----|-----|
  | almacenes        |  ✓  |  ✓  |  ✓  |  ✓  |  ✓  |  ✓  |  ✓  |  ✓  |
  | categorias       |  ✓  |  ✓  |  ✓  |  ✓  |  ✓  |  ✓  |  ✓  |  ✓  |
  | productos        |  ✓  |  ✓  |  ✓  |  ✓  |  ✓  |  ✓  |  ✓  |  ✓  |
  | productos_extras |  ✓  |  ✗  |  ✗  |  ✗  |  ✗  |  ✗  |  ✗  |  ✗  |  ⚠️ recién migrada
  | audit_log        |  ✓  |  -  |  -  |  -  |  -  |  -  |  ✓  |  -  |  (tabla_uso=interna)
  ...

  Cobertura global:  87/104 capas (84%)

  GAPS PRIORITARIOS:
  ⚠️  productos_extras (recién migrada): falta TODO el ecosistema.
       Siguiente paso: /back-scaffold-from-meta productos_extras

═══════════════════════════════════════════════════════
```

## Reglas

- Read-only.
- Solo cuenta capas EXPECTADAS por `tabla_uso`:
  - `interna` → no espera UI ni MSW ni API.
  - `lectura` → espera UI (solo lista/detalle), MSW, API GET.
  - `reporte` → espera UI especial, no espera CRUD.
  - `crud` → espera TODO.
- Cobertura global = capas presentes / capas esperadas total.
- Gaps priorizados por edad (más nueva = más urgente).
