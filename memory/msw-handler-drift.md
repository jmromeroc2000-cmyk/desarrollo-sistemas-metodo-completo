---
name: MSW v2 handlers escritos a mano se desincronizan de los types del API
description: Cuando backend agrega/renombra un campo en campos_sistema, los handlers MSW del frontend siguen mock-eando el shape viejo hasta que alguien los actualiza. Solución: auto-generar handlers desde metadata con `npm run msw:gen`.
type: feedback
---

MSW v2 (`msw@^2`) requiere handlers escritos en TS:

```ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/v1/productos', () => {
    return HttpResponse.json({
      data: [
        { id: 'x', codigo: 'P001', nombre: 'Producto X', activo: 1 }
      ]
    });
  }),
];
```

Si backend cambia `campos_sistema` agregando `descripcion_corta` o
renombrando `codigo` → `sku`, los handlers MSW siguen devolviendo el shape
viejo. Tests unit con MSW pasan porque mockean el contrato STALE; en
producción todo se rompe.

**How to apply:**

1. **Auto-generar** handlers desde metadata. Skill `front-msw-from-meta`
   produce `Dev/frontend/src/test/msw/_generated.ts` con un handler per
   tabla en `tablas_sistema` donde `generar_ui_crud=1`:

   ```ts
   // _generated.ts — NO editar manualmente
   import { http, HttpResponse } from 'msw';
   import type { Producto } from '../../api/types/_generated';

   const fixtureProductos: Producto[] = [/* derivado de campos_sistema */];

   export const handlersProductos = [
     http.get('/v1/productos', ({ request }) => {
       return HttpResponse.json({ data: fixtureProductos, next_cursor: null });
     }),
     http.get('/v1/productos/:id', ({ params }) => {
       const item = fixtureProductos.find(p => p.id === params.id);
       return item
         ? HttpResponse.json({ data: item })
         : HttpResponse.json({ type: '...', title: 'Not found', status: 404 }, { status: 404 });
     }),
     // POST, PATCH, DELETE igual...
   ];
   ```

2. Tests importan de `_generated.ts`. Si quieren overrides locales
   (testear error case), composean encima:

   ```ts
   import { handlersProductos } from './_generated';

   const handlers = [
     ...handlersProductos,
     http.get('/v1/productos', () => HttpResponse.json(
       { type: '...', status: 503 }, { status: 503 }
     )),  // ← override puntual
   ];
   ```

3. **CI valida sync**: job `metadata-snapshot-sync-check` corre
   `npm run msw:gen` + `git diff --exit-code _generated.ts`. Si hay diff,
   regenerar y commitear.

4. Fixtures derivados de `campos_sistema.tipo_validacion`:
   - `'TEXTO'` → `'string de longitud media'`
   - `'NUMERO_ENTERO'` con range → valor del medio del rango
   - `'CATALOGO'` → primer valor del enum
   - `'FECHA_HORA'` → fecha fija ISO
   Reproducible, no flakey.

**Por qué no usar `msw` de forma reactiva (interceptar real fetch a backend):**
porque tests unit deben correr sin backend. La regla es: **handlers MSW
son contrato del frontend**, debe coincidir 1:1 con el real backend.
Auto-generar elimina la deriva.
