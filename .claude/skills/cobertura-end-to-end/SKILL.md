---
name: cobertura-end-to-end-meta-codigo-ui-tests
description: >
  Activar para verificar que cada tabla en tablas_sistema tiene todo su
  ecosistema implementado: endpoint REST, tests de integración, módulo
  backend (queries+service+controller+routes), página/componente frontend
  (si generar_ui_crud=1), y entrada en docs. Reporta tablas con cobertura
  parcial y propone qué falta.
  Comandos de activación: /cobertura-end-to-end
---

# SKILL — Cobertura end-to-end por tabla (QA cross-fase)

**Fase del método:** QA (cross-fase)
**Modo asociado:** `/sis`
**Activación:** `/cobertura-end-to-end`

## Pre-condiciones

- Sistema en al menos Fase 5 (con módulos programados)
- BD viva accesible
- Estructura `src/modules/<X>/` y `frontend/src/pages/<X>/` esperable

## Pasos

1. **Listar tablas a verificar**:
   ```sql
   SELECT nombre_tabla, funcion, generar_ui_crud
     FROM tablas_sistema
    WHERE funcion IN ('CATALOGO', 'TRANSACCIONAL', 'REFERENCIA', 'IDENTIDAD')
    ORDER BY funcion, nombre_tabla;
   ```

2. **Para cada tabla, verificar 5 dimensiones**:

### A. Backend — módulo de 4 archivos
- `src/modules/<X>/queries.js` existe
- `src/modules/<X>/service.js` existe e importa `validateFields`
- `src/modules/<X>/controller.js` existe
- `src/modules/<X>/routes.js` existe y aparece registrado en `src/app.js`

### B. Endpoints
```bash
curl -s http://localhost:3001/v1/<X> -H "Authorization: Bearer $TOKEN" \
  | jq '. | type'
# Esperado: "object" (no error)
```

### C. Tests de integración
- `tests/integration/<X>/<X>.test.js` existe
- Cubre: 200/401/403/404, paginación, filtros principales

### D. Frontend (solo si `generar_ui_crud=1`)
- `frontend/src/pages/<X>/<X>List.tsx` existe
- `frontend/src/pages/<X>/<X>Form.tsx` existe (si CRUD completo)
- Ruta registrada en `router/routes.tsx`
- Item en `layout/navigation.tsx`

### E. Documentación
- Mencionado en `docs/03-modelo-datos.md` (en la sección apropiada)
- Endpoint documentado en `docs/05-contratos-api.md`

3. **Generar reporte por tabla**:
   ```
   <tabla>: BACKEND ✓ | ENDPOINTS ✓ | TESTS ✓ | UI <flag> | DOCS ✓ | OK
   <tabla>: BACKEND ✓ | ENDPOINTS ✓ | TESTS ✗ | UI ✗     | DOCS ✓ | INCOMPLETO
   ```

4. **Para cada gap detectado, recomendar el skill que lo resuelve**:
   - Falta backend → `/back-scaffold-from-meta`
   - Falta UI → `/front-scaffold-from-meta`
   - Faltan tests → generar suite (parte del scaffold backend)
   - Falta doc → mención manual en doc 03/05

## Output esperado

```
✅ COBERTURA END-TO-END — <fecha>

Tablas auditadas: N (de tablas_sistema con función operativa)

Resumen por dimensión:
  Backend:    X/N  ✓
  Endpoints:  X/N  ✓
  Tests:      X/N
  Frontend:   X/M  (de las que tienen generar_ui_crud=1)
  Docs:       X/N

Tablas con cobertura completa: <count>
Tablas con cobertura parcial:  <count>
  - <tabla>: falta <dimensión> → ejecutar /<skill>
  - <tabla>: falta <dimensión> → ...
```

## Verificación

```bash
# Si /cobertura-end-to-end retorna 100%, el sistema está listo para producción
# en términos de completitud (no de calidad — eso lo cubre /audit-pendientes)
```

## Reglas

- ✓ Solo bloquear release si tabla TRANSACCIONAL está incompleta
- ✓ CATALOGO sin UI se permite si `generar_ui_crud=0` explícitamente
- ✗ Marcar como "OK" una tabla con tests vacíos o solo placeholders
- ✗ Considerar coverage únicamente por existencia del archivo — verificar que
  el archivo tiene contenido real
