---
name: meta-derive-openapi
description: >
  Activar para generar OpenAPI 3.1 YAML desde metadata. Para cada tabla con generar_ui_crud=1
  emite paths /v1/<recurso> con GET/POST/GET-by-id/PATCH/DELETE + components.schemas con
  Type derivado de campos_sistema. Output: Dev/openapi.yaml. Útil para Postman, Insomnia,
  integradores B2B, generador de SDKs externos.
  Comandos de activación: /openapi:gen · /meta-derive-openapi
---

# SKILL — Codegen OpenAPI 3.1 desde metadata

Genera contrato OpenAPI completo del API a partir de la metadata.
Mantenido automáticamente sincronizado con `tablas_sistema` y
`campos_sistema`.

## Invocación

```
/openapi:gen
```

Equivalente a `npm run openapi:gen` (script en `Dev/package.json`).

## Procedimiento

```bash
cd Dev
npm run openapi:gen
git diff openapi.yaml
git add openapi.yaml && git commit -m "chore(be): regenera OpenAPI desde metadata"
```

## Output esperado

`Dev/openapi.yaml` con:

- `info`: title, version del proyecto
- `servers`: `/v1`
- `components.schemas`: un schema por tabla CRUD
- `components.schemas.ProblemDetail`: el shape RFC 9457
- `components.responses`: NotFound/Unauthorized/Forbidden/Conflict reutilizables
- `components.securitySchemes`: bearerAuth JWT
- `paths`: para cada tabla `generar_ui_crud=1`:
  - `GET /<recurso>` (lista)
  - `POST /<recurso>` (crear)
  - `GET /<recurso>/{id}` (detalle)
  - `PATCH /<recurso>/{id}` (actualizar)
  - `DELETE /<recurso>/{id}` (eliminar)

## Uso del output

### Cargar en Postman/Insomnia

```bash
# Postman: Import → File → openapi.yaml
# Insomnia: Import/Export → URL → file://openapi.yaml
```

### Generador de SDK externo

```bash
# Java
openapi-generator-cli generate -i openapi.yaml -g java -o sdk-java/

# Python
openapi-generator-cli generate -i openapi.yaml -g python -o sdk-python/
```

### Validar respuestas reales del API contra OpenAPI

```bash
# Con spectral o redocly:
npx @redocly/cli lint openapi.yaml
```

## Limitaciones del codegen v2.0

- Solo cubre CRUD básico. Endpoints custom (login, refresh, /confirmar, etc.)
  no se generan; agregarlos en `openapi-extras.yaml` y mergear manualmente
  con un yq script.
- No infiere FK constraints en schemas (solo `type: string` o `format: uuid`).
- No genera ejemplos (`example:` en YAML) — fixtures están en MSW handlers.

Roadmap v2.1: leer `componentes_sistema` para detectar endpoints custom
y agregarlos automáticamente.

## Reglas

- `openapi.yaml` se gitea.
- NO editar a mano. Custom endpoints van en `openapi-extras.yaml` (mergeado en build).
- Bump de `info.version` lo hace release-please automático (lee package.json).
