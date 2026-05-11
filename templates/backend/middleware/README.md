# templates/backend/middleware/

Middlewares Express portables que el método entrega por defecto. Copiar a
`Dev/src/middleware/` al bootstrap.

## protectMetadata.js — Capa 1 de protección de metadata

**Reemplaza al PG-only `SET LOCAL app.allow_metadata_change`** de v2.0.

Bloquea cualquier write HTTP a tablas de metadata (`tablas_sistema`,
`campos_sistema`, etc.) excepto cuando el migration runner activa el bypass
via `app.locals.allowMetadataChange = true`.

```js
// app.js
import { protectMetadata } from './middleware/protectMetadata.js';

app.use(authenticate);
app.use(protectMetadata);   // ← después de auth, antes de rutas
app.use(rutasMetadata);
```

```js
// migrate.js (parte del runner)
import { withMetadataChangeAllowed } from './middleware/protectMetadata.js';

await withMetadataChangeAllowed(app, async () => {
  await aplicarMigracionesSQL();
});
```

### Por qué app-layer en vez de trigger BD

- **Spanner no soporta triggers** — al exigir portabilidad a los 6 DBMS,
  la protección DEBE vivir en app-layer.
- En PG/Oracle/DB2/MySQL/SQL Server tenemos **además** triggers nativos
  (capa 2, ver `templates/db-adapters/<dbms>/triggers.sql`) — defensa en
  profundidad contra acceso SQL directo (DBA, herramientas externas).
- En Spanner solo aplica la capa 1. La política operativa (no dar acceso
  SQL directo) cubre el resto.

### Trade-off vs v2.0

| v2.0 (PG-only) | v3.0 (portable) |
|----------------|------------------|
| `SET LOCAL app.allow_metadata_change = 'true'` en SQL | `app.locals.allowMetadataChange = true` en JS |
| Trigger BD `trg_metadata_inmutable` único | Middleware HTTP + trigger nativo por DBMS |
| Funciona en PG | Funciona en los 6 DBMS |

## Otros middlewares estándar

(documentar aquí cuando se agreguen otros del método: auth, authorize,
maintenanceGuard, checkGating, correlationId, etc.)
