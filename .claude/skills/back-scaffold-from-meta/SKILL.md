---
name: back-scaffold-from-meta-modulo-4-archivos
description: >
  Activar para generar el scaffold backend (4 archivos) de un módulo nuevo
  leyendo campos_sistema como contrato. Genera queries.js (SELECT con
  columnas reales), service.js (validateFields del helper), controller.js
  (RFC 9457) y routes.js (authorize por roles_modificacion). Garantiza que
  el código respeta exactamente la metadata declarada.
  Comandos de activación: /back-scaffold-from-meta
---

# SKILL — Scaffold backend desde metadata (Fase 5)

**Fase del método:** 5 (programación backend)
**Modo asociado:** `/dev`
**Activación:** `/back-scaffold-from-meta`

## Pre-condiciones

- Fase 1 completa para la tabla destino
- `/meta-validate` da 0 gaps
- Helper `src/utils/metadataValidation.js` disponible
- Patrón de 4 archivos establecido en `src/modules/<X>/`

## Diagnóstico obligatorio

Preguntar:

- [ ] **Nombre de la tabla** (debe existir en `tablas_sistema`)
- [ ] **Tipo de operaciones** — CRUD completo, solo lectura, lectura + create
- [ ] **Estados manejados** (si la tabla es TRANSACCIONAL con estados)
- [ ] **Roles autorizados por operación** (lista, leer, crear, actualizar, borrar)

## Pasos

1. **Leer contrato desde metadata**:
   ```sql
   SELECT * FROM tablas_sistema WHERE nombre_tabla = '<X>';

   SELECT nombre_campo, formato_despliegue, tipo_validacion, regex_validacion,
          valores_posibles, valor_minimo, valor_maximo, valor_defecto,
          obligatorio, visible_en_lista, visible_en_form, editable,
          sensible_lfpdppp, categoria_dato_personal
     FROM campos_sistema WHERE nombre_tabla = '<X>'
    ORDER BY orden_despliegue;
   ```

2. **Generar `src/modules/<X>/queries.js`**:
   - SELECTs con columnas declaradas en `campos_sistema`
   - Si hay PII, marcar la query con comment para review
   - Paginación cursor-based usando `creado_en, id` como tie-breaker
   - JOINs auto-detectados desde `tabla_referencia`

   ```javascript
   // SQL puro — campos derivados de campos_sistema (mig 0XX).
   // Ningún campo en SELECT que no esté declarado en campos_sistema.

   export async function findAll<X>(client, { limit, cursor, ...filters }) {
     // ... cursor-based pagination ...
     const { rows } = await client.query(`
       SELECT <campos_visible_en_lista>
         FROM <X>
        WHERE activo = 1
        ORDER BY creado_en, id
        LIMIT $1
     `, [limit + 1]);
     return rows;
   }

   export async function find<X>ById(client, id) { /* ... */ }
   export async function insert<X>(client, data) { /* ... */ }
   export async function update<X>(client, id, data) { /* ... */ }
   export async function deactivate<X>(client, id) { /* ... */ }
   ```

3. **Generar `src/modules/<X>/service.js`**:
   - Importa `validateFields` del helper
   - Aplica validación a TODOS los campos con `tipo_validacion ≠ 'NINGUNA'`
   - Lógica de negocio derivada de notas de la tabla
   - Errores con `appError(status, message)`

   ```javascript
   import { withClient, withTransaction } from '../../db/transaction.js';
   import { validateFields } from '../../utils/metadataValidation.js';
   import { generateId } from '../../utils/uuid.js';
   import * as q from './queries.js';

   export async function create<X>(data) {
     // Validación derivada de campos_sistema — sin duplicar regex aquí
     await validateFields('<X>', data);

     return withTransaction(async c => {
       const id = generateId();
       await q.insert<X>(c, { id, ...data, now: now() });
       return q.find<X>ById(c, id);
     });
   }
   ```

4. **Generar `src/modules/<X>/controller.js`**:
   - Maneja request/response HTTP
   - Errores con RFC 9457 Problem Details vía `createProblem`
   - Lectura de `req.user.roles` para enmascarado de campos sensibles

5. **Generar `src/modules/<X>/routes.js`**:
   - `authorize()` con roles según operación
   - Default: lista/leer = ALL_ROLES, create/update = administrador,
     delete = administrador
   - `maintenanceGuard` en escritura

   ```javascript
   import { Router } from 'express';
   import { authenticate } from '../../middleware/authenticate.js';
   import { authorize } from '../../middleware/authorize.js';
   import { maintenanceGuard } from '../../middleware/maintenanceGuard.js';
   import { ROLES } from '../../config/constants.js';
   import * as ctrl from './controller.js';

   const router = Router();
   const { ADMINISTRADOR, OPERADOR, USUARIO, DESARROLLADOR, VISUALIZADOR } = ROLES;
   const ALL_ROLES = [ADMINISTRADOR, OPERADOR, USUARIO, DESARROLLADOR, VISUALIZADOR];
   const ADMIN_ONLY = [ADMINISTRADOR];

   router.get('/<X>',          authenticate, authorize(ALL_ROLES),  ctrl.list);
   router.get('/<X>/:id',      authenticate, authorize(ALL_ROLES),  ctrl.get);
   router.post('/<X>',         authenticate, authorize(ADMIN_ONLY), maintenanceGuard, ctrl.create);
   router.patch('/<X>/:id',    authenticate, authorize(ADMIN_ONLY), maintenanceGuard, ctrl.update);
   router.delete('/<X>/:id',   authenticate, authorize(ADMIN_ONLY), maintenanceGuard, ctrl.deactivate);

   export default router;
   ```

6. **Registrar las rutas** en `src/app.js`:
   ```javascript
   import <X>Routes from './modules/<X>/routes.js';
   app.use('/v1', <X>Routes);
   ```

7. **Generar tests** en `tests/integration/<X>/<X>.test.js` cubriendo:
   - 200 OK, 401 sin token, 403 rol incorrecto
   - 400 con valores que NO cumplen `regex_validacion`
   - 400 con valores fuera de `valores_posibles`
   - Cursor pagination

## Output esperado

- `src/modules/<X>/queries.js`
- `src/modules/<X>/service.js`
- `src/modules/<X>/controller.js`
- `src/modules/<X>/routes.js`
- `tests/integration/<X>/<X>.test.js`
- Línea agregada en `src/app.js`

## Verificación

```bash
npm test -- <X>
# Esperado: tests verde

# Y que el módulo respete la metadata:
psql -c "SELECT array_agg(nombre_campo) FROM campos_sistema WHERE nombre_tabla='<X>'"
# debe coincidir con los campos referenciados en queries.js
```

## Reglas

- ✗ Hardcodear regex/listas que ya están en `campos_sistema` — usar `validateFields`
- ✗ Generar SELECTs con columnas que NO están en `campos_sistema`
- ✗ Saltar `maintenanceGuard` en operaciones de escritura
- ✓ `service.js` invoca `validateFields(<X>, data)` antes de cualquier mutación
- ✓ Cada test cubre el patrón de validación derivado (REGEX/LISTA/RANGO)
