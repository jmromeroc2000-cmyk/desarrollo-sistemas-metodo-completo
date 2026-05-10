---
name: front-scaffold-from-meta-pages-y-componentes
description: >
  Activar para generar componentes UI (lista + form + detalle) desde
  campos_sistema. Respeta visible_en_lista, visible_en_form, formato_despliegue,
  mensaje_ayuda, tipo_validacion. Genera columnas de tabla, controles del form
  con tipo correcto (DatePicker para FECHA, NumberInput para MONEDA_MXN, etc.),
  tooltips de ayuda y validación derivada en runtime.
  Comandos de activación: /front-scaffold-from-meta
---

# SKILL — Scaffold frontend desde metadata (Fase 5)

**Fase del método:** 5 (programación frontend)
**Modo asociado:** `/dev`
**Activación:** `/front-scaffold-from-meta`

## Pre-condiciones

- Fase 1 completa para la tabla destino
- Backend ya tiene endpoints `GET /v1/<X>`, `POST`, `PATCH`, `DELETE`
  (típicamente generados con `/back-scaffold-from-meta`)
- Frontend con TanStack Query + React Hook Form + Tailwind v4

## Diagnóstico obligatorio

Preguntar:

- [ ] **Tabla destino** (debe existir en `tablas_sistema` con `generar_ui_crud=1`)
- [ ] **Tipo de UI**: solo lista, lista + detalle, CRUD completo
- [ ] **Patrón de página**: dashboard separado, sub-tab, modal

## Pasos

1. **Leer contrato visual desde metadata**:
   ```sql
   SELECT nombre_campo, nombre_corto, nombre_largo, formato_despliegue,
          mensaje_ayuda, tipo_validacion, regex_validacion, valores_posibles,
          valor_minimo, valor_maximo, obligatorio, visible_en_lista,
          visible_en_form, editable, sensible_lfpdppp, orden_despliegue
     FROM campos_sistema
    WHERE nombre_tabla = '<X>'
    ORDER BY orden_despliegue;
   ```

2. **Mapeo formato_despliegue → control React**:

   | formato_despliegue | Control |
   |--------------------|---------|
   | `TEXTO` | `<Input type="text">` |
   | `TEXTO_LARGO` | `<Textarea>` |
   | `EMAIL` | `<Input type="email">` |
   | `TELEFONO` | `<Input type="tel">` con máscara |
   | `URL` | `<Input type="url">` |
   | `RFC` | `<Input>` con validación |
   | `CODIGO` | `<Input>` autoUppercase |
   | `NUMERO_ENTERO` | `<NumberInput integer>` |
   | `NUMERO_DECIMAL` | `<NumberInput>` |
   | `MONEDA_MXN` | `<NumberInput currency="MXN">` |
   | `PORCENTAJE` | `<NumberInput suffix="%">` |
   | `FECHA` | `<DatePicker>` |
   | `FECHA_HORA` | `<DateTimePicker>` |
   | `BOOLEANO_SI_NO` | `<Switch>` |
   | `BOOLEANO_ACTIVO` | `<Switch label="Activo">` |
   | `ESTADO` | `<Badge>` para listas, `<Select>` para forms |
   | `RELACION` | `<Combobox>` con datos del recurso referenciado |
   | `UUID` | `<Input>` solo lectura |
   | `SISTEMA` | (no mostrar — campo interno) |

3. **Generar `frontend/src/pages/<X>/<X>List.tsx`**:
   ```tsx
   // Columnas DERIVADAS de campos_sistema con visible_en_lista=1
   // Etiqueta de columna usa nombre_corto
   // Formato de celda usa formato_despliegue

   export function <X>List() {
     const { data: campos } = useCamposSistema('<X>');
     const { data: registros } = use<X>();
     const columnas = campos.filter(c => c.visible_en_lista === 1)
       .sort((a, b) => a.orden_despliegue - b.orden_despliegue);

     return (
       <DataTable
         columns={columnas.map(c => ({
           accessorKey: c.nombre_campo,
           header: c.nombre_corto,
           cell: ({ value }) => formatBy(c.formato_despliegue, value),
         }))}
         data={registros}
       />
     );
   }
   ```

4. **Generar `frontend/src/pages/<X>/<X>Form.tsx`**:
   - React Hook Form con resolvers Zod **derivados de campos_sistema**
   - Cada control respeta `obligatorio`, `tipo_validacion`, `regex_validacion`
   - Tooltip con `mensaje_ayuda` en cada label
   - `editable=0` → control deshabilitado en modo edición

5. **Generar Zod schema dinámico** desde metadata:
   ```typescript
   function buildSchemaFromMeta(campos: CampoSistema[]) {
     const shape: Record<string, ZodTypeAny> = {};
     for (const c of campos.filter(c => c.visible_en_form === 1)) {
       let validator: ZodTypeAny = z.string();
       if (c.formato_despliegue === 'EMAIL') validator = z.string().email();
       if (c.formato_despliegue === 'NUMERO_ENTERO') validator = z.number().int();
       if (c.tipo_validacion === 'REGEX' && c.regex_validacion) {
         validator = z.string().regex(new RegExp(c.regex_validacion));
       }
       if (c.tipo_validacion === 'LISTA' && c.valores_posibles) {
         validator = z.enum(c.valores_posibles.split(',').map(s => s.trim()) as [string, ...string[]]);
       }
       if (c.obligatorio === 0) validator = validator.optional();
       shape[c.nombre_campo] = validator;
     }
     return z.object(shape);
   }
   ```

6. **Generar `frontend/src/pages/<X>/<X>Detail.tsx`** con vista de solo lectura
   formateada según `formato_despliegue`.

7. **Registrar la ruta** en `frontend/src/router/routes.tsx`:
   ```tsx
   <Route path="/<X>" element={<<X>List />} />
   <Route path="/<X>/:id" element={<<X>Detail />} />
   <Route path="/<X>/:id/edit" element={<<X>Form />} />
   ```

8. **Generar tests E2E** en `frontend/e2e/<X>.spec.ts` que cubran:
   - Navegación: lista → detalle → edit → save
   - Validación: campo obligatorio vacío muestra error
   - Validación: regex inválido muestra error
   - a11y: axe-core sin violaciones críticas

## Output esperado

- `frontend/src/pages/<X>/<X>List.tsx`
- `frontend/src/pages/<X>/<X>Form.tsx`
- `frontend/src/pages/<X>/<X>Detail.tsx`
- `frontend/src/api/<X>.ts` (cliente HTTP)
- `frontend/src/queries/<X>.ts` (TanStack Query hooks)
- `frontend/e2e/<X>.spec.ts`
- Rutas agregadas en `frontend/src/router/routes.tsx`
- Item de menú agregado en `frontend/src/layout/navigation.tsx`

## Verificación

```bash
cd Dev/frontend
npm run typecheck          # 0 errores TS
npm run lint               # 0 warnings
npm run preflight          # validate-frontend.js sin errores
npm run test:e2e:smoke     # Playwright suite básica
npm run test:a11y          # axe-core suite
```

## Reglas

- ✗ Renderizar columnas/campos NO declarados en `campos_sistema`
- ✗ Saltar `mensaje_ayuda` en formularios (CHECK BD lo enforce)
- ✗ Implementar regex hardcoded — siempre derivado de metadata
- ✓ Cada `formato_despliegue` mapea a UN control único (consistencia visual)
- ✓ Variantes dark mode obligatorias (siguiendo el DoD UI §5.1.1)
