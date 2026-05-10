---
name: programador-diseno-apis
description: >
  Activar cuando el usuario pida: diseñar o revisar una API REST o GraphQL;
  definir endpoints, métodos HTTP y códigos de respuesta; crear o validar un
  contrato OpenAPI/Swagger; diseñar estrategias de versionado, paginación o
  manejo de errores en APIs; evaluar la seguridad de una API; diseñar
  autenticación con JWT u OAuth 2.0; documentar una API existente; o cualquier
  tarea donde el diseño o la especificación de una interfaz de programación
  sea el entregable principal.
  Comandos de activación: /dev-api · [MODO: API]
---

# SKILL — Diseño de APIs REST y GraphQL

## 1. Verificaciones obligatorias ANTES de diseñar

- [ ] **Tipo de API** — ¿REST, GraphQL, gRPC, WebSocket, o combinación?
- [ ] **Consumidores** — ¿clientes web, móvil, terceros, internos (microservicios)?
- [ ] **Autenticación** — ¿API Key, JWT, OAuth 2.0, mTLS?
- [ ] **Versionado** — ¿hay versiones previas que mantener? ¿estrategia: URL, header, parámetro?
- [ ] **Contrato** — ¿se genera código desde el contrato (contract-first) o se documenta el código existente?
- [ ] **SLAs** — ¿hay requisitos de latencia, disponibilidad o rate limits?

---

## 2. Madurez REST — Richardson Maturity Model

```
NIVEL 0 — Un solo endpoint, todo por POST
  /api  POST {"action": "getUser", "id": 123}
  → Evitar: no es REST, es RPC sobre HTTP.

NIVEL 1 — Recursos identificados por URL
  /api/users/123  POST {"action": "get"}
  → Mejor, pero los verbos HTTP no se usan correctamente.

NIVEL 2 — Verbos HTTP correctos + códigos de estado (MÍNIMO ACEPTABLE)
  GET /api/users/123  → 200 OK
  POST /api/users     → 201 Created
  → Este nivel es el estándar profesional para la mayoría de APIs.

NIVEL 3 — HATEOAS (hipermedia como motor del estado)
  La respuesta incluye links a las siguientes acciones posibles.
  → Usar en APIs públicas de gran escala; opcional para APIs internas.

OBJETIVO MÍNIMO: Nivel 2 en toda API nueva.
```

---

## 3. Convenciones de diseño — obligatorias

```
URLs:
  □ Sustantivos en plural, minúsculas, guiones medios: /invoice-items
  □ NUNCA verbos en la URL: ✗ /getUser  ✓ GET /users/{id}
  □ Jerarquía refleja relaciones: /users/{userId}/orders/{orderId}
  □ Máximo 3 niveles de anidación: /a/{id}/b/{id}/c — más profundo → revisar diseño
  □ Versión en la URL: /v1/users  (alternativa: header Accept: application/vnd.api+json;version=1)

Verbos HTTP y su semántica:
  GET     → Leer. Idempotente. Sin body. No modifica estado.
  POST    → Crear. No idempotente. Body con el nuevo recurso.
  PUT     → Reemplazar completo. Idempotente. Body con el recurso completo.
  PATCH   → Modificar parcial. Body con solo los campos que cambian.
  DELETE  → Eliminar. Idempotente. Generalmente sin body.

Códigos de respuesta — usar el correcto siempre:
  200 OK              → GET, PUT, PATCH exitoso
  201 Created         → POST exitoso; incluir Location header con URL del nuevo recurso
  204 No Content      → DELETE exitoso; PUT/PATCH sin body de respuesta
  400 Bad Request     → Validación fallida; incluir detalle del error
  401 Unauthorized    → No autenticado (falta o token inválido)
  403 Forbidden       → Autenticado pero sin permiso
  404 Not Found       → Recurso no existe
  409 Conflict        → Conflicto de estado (ej: email duplicado)
  422 Unprocessable   → Entidad semánticamente inválida
  429 Too Many Req.   → Rate limit excedido; incluir Retry-After header
  500 Internal Error  → Error del servidor; nunca exponer stack trace
```

---

## 4. Formato de respuesta — estándar

```
RESPUESTA EXITOSA (objeto):
{
  "data": {
    "id": "usr_01J2K...",
    "email": "usuario@empresa.com",
    "created_at": "2024-11-15T10:30:00Z"
  }
}

RESPUESTA EXITOSA (colección paginada):
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 342,
    "total_pages": 18,
    "next": "/v1/users?page=2",
    "prev": null
  }
}

RESPUESTA DE ERROR — RFC 9457 Problem Details (obligatorio):
{
  "type": "https://api.empresa.com/errors/validation-error",
  "title": "Error de validación",
  "status": 400,
  "detail": "El campo 'email' no tiene un formato válido.",
  "instance": "/v1/users",
  "errors": [
    {"field": "email", "message": "Formato de email inválido", "value": "no-es-email"}
  ]
}
```

---

## 5. Paginación — estrategias y cuándo usar cada una

| Estrategia | Cuándo usar | Ventaja | Limitación |
|------------|-------------|---------|------------|
| **Offset/limit** | Datasets pequeños (<100k), UI con páginas numeradas | Simple de implementar | Inconsistente si los datos cambian; lento en páginas altas |
| **Cursor** | Feeds, listas en tiempo real, datasets grandes | Consistente, eficiente | No permite saltar a página N directamente |
| **Keyset** | Ordenamiento por columna con índice | Muy eficiente en BD | Requiere columna con índice único |

Reglas:
- Siempre paginar colecciones — nunca retornar listas ilimitadas
- Tamaño máximo de página: definirlo y documentarlo (recomendado: max 100)
- Default de página: explícito en la documentación (recomendado: 20)

---

## 6. Roles de usuario — obligatorios en toda API con usuarios

Toda API que gestione usuarios debe implementar y documentar los siguientes
5 roles mínimos. Deben reflejarse en el contrato OpenAPI y en la lógica
de autorización de cada endpoint.

```
ROLES MÍNIMOS OBLIGATORIOS:

  administrador
    Acceso a todos los endpoints sin excepción.
    Puede gestionar usuarios, roles, configuración y parámetros del sistema.
    Identificar en el contrato: security scope "admin" o claim role=administrador

  operador
    Acceso a endpoints de operación del negocio (crear, modificar registros).
    No accede a endpoints de gestión de usuarios ni configuración del sistema.
    Identificar en el contrato: security scope "operador"

  usuario
    Acceso a endpoints propios de su perfil funcional.
    Solo puede leer y modificar sus propios recursos, no los de otros.
    Identificar en el contrato: security scope "usuario"

  desarrollador
    Acceso a endpoints técnicos: health, métricas, logs, configuración técnica.
    No accede a datos de negocio de usuarios finales en producción.
    Identificar en el contrato: security scope "developer"

  visualizador
    Acceso exclusivo a endpoints GET (solo lectura).
    Cualquier endpoint que modifique estado debe retornar 403 para este rol.
    Identificar en el contrato: security scope "viewer"
```

**Implementación en el contrato OpenAPI:**

```yaml
# Definir los scopes en securitySchemes
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

# En cada endpoint, declarar qué roles tienen acceso:
paths:
  /usuarios:
    get:
      security:
        - bearerAuth: []
      x-roles-permitidos: [administrador, visualizador]
      # 403 Forbidden para: operador, usuario, desarrollador
    post:
      security:
        - bearerAuth: []
      x-roles-permitidos: [administrador, operador]
      # 403 Forbidden para: usuario, desarrollador, visualizador

# Matriz de acceso obligatoria en la documentación:
# Endpoint              | admin | operador | usuario | developer | visualizador
# GET  /recursos        |   ✓   |    ✓     |    ✓    |     ✓     |      ✓
# POST /recursos        |   ✓   |    ✓     |    *    |     ✗     |      ✗
# PUT  /recursos/{id}   |   ✓   |    ✓     |    *    |     ✗     |      ✗
# DELETE /recursos/{id} |   ✓   |    ✗     |    ✗    |     ✗     |      ✗
# GET  /config          |   ✓   |    ✗     |    ✗    |     ✓     |      ✗
# * = solo sus propios recursos
```

**Verificación obligatoria en el diseño de cada endpoint:**
```
□ ¿Está documentado qué roles tienen acceso a este endpoint?
□ ¿El visualizador queda restringido a solo GET?
□ ¿El desarrollador no puede acceder a datos de negocio en producción?
□ ¿Existe al menos un endpoint accesible solo por administrador?
□ ¿Los errores de autorización retornan 403 (no 401)?
  401 = no autenticado (token faltante o inválido)
  403 = autenticado pero sin permiso (rol insuficiente)
```

---

## 7. Autenticación y seguridad — checklist

```
JWT:
  □ Firmar con RS256 (asimétrico) en lugar de HS256 para APIs públicas
  □ Expiración corta en access token: 15-60 minutos
  □ Refresh token con rotación: invalidar el anterior al emitir uno nuevo
  □ No almacenar información sensible en el payload (es decodificable)
  □ Validar: firma, expiración, issuer, audience

HEADERS DE SEGURIDAD OBLIGATORIOS:
  □ Authorization: Bearer {token}  (no en URL, no en query params)
  □ Strict-Transport-Security: max-age=31536000  (solo HTTPS)
  □ X-Content-Type-Options: nosniff
  □ X-Frame-Options: DENY

RATE LIMITING — headers de respuesta estándar:
  □ X-RateLimit-Limit: 1000
  □ X-RateLimit-Remaining: 847
  □ X-RateLimit-Reset: 1700000000  (Unix timestamp)
  □ Retry-After: 60  (en respuesta 429)

VALIDACIÓN DE INPUT:
  □ Validar tipo, formato y rango de TODOS los campos del request
  □ Sanitizar inputs para prevenir injection (SQL, NoSQL, command)
  □ Limitar tamaño del request body (ej: max 1MB)
  □ Nunca confiar en el Content-Type declarado — validar el contenido real
```

---

## 8. OpenAPI / Swagger — contrato obligatorio

```
ESTRUCTURA MÍNIMA DEL CONTRATO (OpenAPI 3.1):
  openapi: "3.1.0"
  info:
    title: Nombre de la API
    version: "1.0.0"
    description: Qué hace esta API y para quién es
  servers:
    - url: https://api.empresa.com/v1
      description: Producción
    - url: https://api-staging.empresa.com/v1
      description: Staging
  paths:
    /users/{userId}:
      get:
        summary: Obtener usuario por ID
        parameters: [...]
        responses:
          "200":
            description: Usuario encontrado
            content:
              application/json:
                schema:
                  $ref: "#/components/schemas/User"
          "404":
            $ref: "#/components/responses/NotFound"
  components:
    schemas: [...]
    responses: [...]
    securitySchemes: [...]

REGLAS:
  □ Documentar TODOS los códigos de respuesta posibles, no solo el 200
  □ Incluir ejemplos (examples) en cada schema
  □ Usar $ref para reutilizar schemas y evitar duplicación
  □ Documentar los parámetros de autenticación en securitySchemes
```

---

## 9. GraphQL — cuándo y cómo

```
USAR GraphQL cuando:
  ✓ Los clientes necesitan consultas flexibles (diferentes campos por cliente)
  ✓ Hay múltiples tipos de clientes (web, móvil, terceros) con necesidades distintas
  ✓ El modelo de datos es un grafo con muchas relaciones
  ✓ Se quiere evitar over-fetching y under-fetching

USAR REST cuando:
  ✓ API pública con terceros desconocidos
  ✓ Operaciones simples CRUD
  ✓ Cacheo agresivo a nivel HTTP es importante
  ✓ El equipo no tiene experiencia con GraphQL

PROBLEMAS OBLIGATORIOS A RESOLVER en GraphQL:
  □ N+1 queries → usar DataLoader (batching)
  □ Query depth excesiva → limitar profundidad máxima (recomendado: 5)
  □ Query complexity → implementar cost analysis
  □ Introspección en producción → deshabilitarla o protegerla
```

---

## 10. Versionado — estrategia y reglas de compatibilidad

```
CAMBIOS COMPATIBLES (no requieren nueva versión):
  ✓ Añadir nuevos endpoints
  ✓ Añadir campos opcionales a respuestas
  ✓ Añadir parámetros opcionales a requests
  ✓ Añadir nuevos valores a enums (con cuidado)

CAMBIOS INCOMPATIBLES (requieren nueva versión):
  ✗ Eliminar o renombrar endpoints
  ✗ Cambiar el tipo de un campo
  ✗ Hacer obligatorio un campo que era opcional
  ✗ Cambiar la semántica de un campo sin cambiar su nombre

POLÍTICA DE DEPRECACIÓN:
  □ Anunciar con mínimo 6 meses de anticipación
  □ Incluir Deprecation header en las respuestas de endpoints deprecados
  □ Mantener versiones anteriores al menos 12 meses después del anuncio
  □ Documentar la ruta de migración en la misma notificación
```

---

## 11. Formato de entrega obligatorio

```
### [Decisiones de diseño]
Por qué REST vs. GraphQL vs. gRPC para este caso.
Estrategia de versionado elegida y justificación.

### [Contrato de la API]
Especificación OpenAPI 3.1 completa o esquema GraphQL.
Incluir ejemplos de request y response para cada operación.

### [Endpoints / Operaciones]
Tabla resumen:
| Método | Path | Descripción | Auth | Rate limit |
|--------|------|-------------|------|------------|

### [Manejo de errores]
Catálogo de errores posibles con su código HTTP y estructura RFC 9457.

### [Seguridad]
Mecanismo de autenticación y autorización.
Headers de seguridad configurados.

### [Advertencias]
Limitaciones conocidas, casos no cubiertos, deuda técnica.

### [Referencias]  ← APA 7, más reciente → más antigua
```

---

## 12. Modos globales — comportamiento de la API por modo

Toda API debe responder de forma diferente según el `SYSTEM_MODE` activo.
Ver skill `/dev-modes` para la especificación completa.

```
MODO DEBUG (SYSTEM_MODE=DEBUG):
  □ Incluir en el header de respuesta:
      X-Correlation-ID: <uuid>
      X-Response-Time-Ms: <ms>
      X-System-Mode: DEBUG
  □ En errores 4xx/5xx incluir en el body (solo en DEBUG):
      "debug": {
        "correlation_id": "...",
        "timestamp": "...",
        "duracion_ms": 45.2,
        "modulo": "pagos.procesar_pago",
        "stack_trace": "..."   ← solo en DEBUG, nunca en PERFORMANCE
      }
  □ Loggear cada request con método, path, parámetros y respuesta completa
  □ Loggear cada query SQL ejecutada con parámetros expandidos
  □ Nunca incluir passwords ni tokens en los logs de DEBUG

MODO PERFORMANCE (SYSTEM_MODE=PERFORMANCE):
  □ Headers mínimos en respuesta (sin headers de debug)
  □ Activar caché de respuestas donde sea correcto (Cache-Control, ETag)
  □ Comprimir respuestas (gzip/br) si el cliente lo soporta
  □ Nivel de log: solo WARNING y ERROR
  □ Sin stack traces en respuestas de error — solo mensaje genérico

MODO MANTENIMIENTO (SYSTEM_MODE=MAINTENANCE):
  □ Los endpoints GET (lectura) responden con normalidad
  □ Los endpoints POST/PUT/PATCH/DELETE retornan:
      HTTP 503 Service Unavailable
      Retry-After: <timestamp estimado de fin de mantenimiento>
      {
        "type": "https://api.sistema.com/errors/maintenance",
        "title": "Sistema en mantenimiento",
        "status": 503,
        "detail": "Las operaciones de escritura están temporalmente suspendidas.
                   Los cambios serán procesados al finalizar el mantenimiento.",
        "instance": "/v1/pagos",
        "maintenance_script": "20241115_103000_pagos_procesar_pago.sql"
      }
  □ Internamente: generar script SQL y retornar referencia al script en el body

VERIFICACIÓN EN EL DISEÑO DE CADA ENDPOINT:
  □ ¿Está documentado el comportamiento del endpoint en modo MAINTENANCE?
  □ ¿Los errores incluyen debug info solo en modo DEBUG?
  □ ¿El caché está configurado correctamente para modo PERFORMANCE?
```

---

## 13. Restricciones

```
MODOS GLOBALES:
✗ No incluir stack traces en respuestas de error en modo PERFORMANCE
✗ No retornar escrituras directas a BD en modo MAINTENANCE — generar script
✗ No omitir el header X-Correlation-ID en modo DEBUG

ROLES DE USUARIO:

```
ROLES DE USUARIO:
✗ No diseñar APIs con usuarios sin documentar los 5 roles mínimos obligatorios:
  administrador, operador, usuario, desarrollador, visualizador
✗ No dejar endpoints sin declarar qué roles tienen acceso
✗ No retornar 401 cuando el problema es de autorización (rol insuficiente) — usar 403
✗ No dar al visualizador acceso a endpoints que modifiquen estado

DISEÑO:
✗ No retornar 200 OK con un body que describe un error
✗ No exponer stack traces o información interna en respuestas de error
✗ No almacenar tokens o credenciales en query parameters (aparecen en logs)
✗ No diseñar endpoints sin documentar sus códigos de error posibles
✗ No omitir paginación en endpoints que retornan colecciones
✗ No usar HTTP en producción — solo HTTPS
✗ No cambiar contratos existentes sin versionado y plan de deprecación
```

---

## 14. Referencias del dominio (APA 7)

OpenAPI Initiative. (2021). *OpenAPI specification 3.1.0*.
    https://spec.openapis.org/oas/v3.1.0

Internet Engineering Task Force. (2023). *RFC 9457: Problem details for
    HTTP APIs*. IETF. https://www.rfc-editor.org/rfc/rfc9457

Masse, M. (2011). *REST API design rulebook*. O'Reilly Media.

Fielding, R. T. (2000). *Architectural styles and the design of
    network-based software architectures* [Doctoral dissertation,
    University of California, Irvine].
    https://ics.uci.edu/~fielding/pubs/dissertation/top.htm
