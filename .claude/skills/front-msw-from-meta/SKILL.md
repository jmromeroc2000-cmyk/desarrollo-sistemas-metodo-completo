---
name: front-msw-from-meta
description: >
  Activar para generar MSW v2 handlers desde metadata. Para cada tabla con generar_ui_crud=1,
  produce handlers GET (list/detail), POST, PATCH, DELETE con fixtures derivados de
  tipo_validacion. Output: Dev/frontend/src/test/msw/_generated.ts. Tests unit del frontend
  jamás se desincronizan del backend mock.
  Comandos de activación: /msw:gen · /front-msw-from-meta
---

# SKILL — Codegen MSW handlers desde metadata

Genera handlers MSW v2 con fixtures determinísticos para cada tabla
CRUD del sistema. Tests unit del frontend usan estos handlers en vez
de mockear a mano.

## Invocación

```
/msw:gen
```

Equivalente a `npm run msw:gen` (script definido en `Dev/frontend/package.json`).

## Procedimiento

```bash
cd Dev/frontend
npm run msw:gen
git diff Dev/frontend/src/test/msw/_generated.ts
```

## Output

Para cada tabla con `generar_ui_crud=1`, 5 handlers:

- `GET /v1/<recurso>` → lista con 3 fixtures
- `GET /v1/<recurso>/:id` → fixture matching o 404
- `POST /v1/<recurso>` → echoes body con id ficticio
- `PATCH /v1/<recurso>/:id` → merge body con fixture
- `DELETE /v1/<recurso>/:id` → 204 si existe, 404 si no

## Fixtures determinísticos

Valores derivados por tipo:

| tipo_validacion | Fixture |
|-----------------|---------|
| UUID | `'00000001-0000-...'`, `'00000002-...'`, etc. |
| TEXTO | `'nombre_1'`, `'nombre_2'`, ... |
| NUMERO_ENTERO | `100`, `101`, `102` |
| FECHA_HORA | `'2026-05-11T10:00:00.000Z'`, ... |
| BOOLEANO_01 | alterna `0` / `1` |
| ESTADO con valores_posibles | `enum[i % enum.length]` |

Reproducible: mismo input → mismo output. Test snapshots no flakean.

## Cómo usar en tests

```ts
// Dev/frontend/src/test/setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './msw/_generated';

export const server = setupServer(...handlers);

// Test que necesita override (testear error case):
import { handlersProductos } from './msw/_generated';
import { http, HttpResponse } from 'msw';

test('maneja 503 maintenance', () => {
  server.use(
    http.get('/v1/productos', () =>
      HttpResponse.json(
        { type: 'https://errors/maintenance', title: 'Mantenimiento', status: 503, detail: '...' },
        { status: 503, headers: { 'Retry-After': '60' } }
      )
    )
  );
  // ...
});
```

## CI

Job `metadata-snapshot-sync` corre `msw:gen` + `git diff --exit-code`.

## Reglas

- Archivo `_generated.ts` se gitea.
- NO editar a mano. Para overrides usar `server.use()` en cada test.
- Para fixtures custom: archivo separado `Dev/frontend/src/test/msw/fixtures-custom.ts`
  que extiende los generados.
- Si tests pasan con `_generated.ts` viejo pero el backend cambió:
  CI lo detecta (job sync).
