// templates/backend/middleware/protect-metadata.js
// Copy a: Dev/src/middleware/protectMetadata.js
//
// ── Capa 1 (OBLIGATORIA, portable a los 6 DBMS) ──
//
// Middleware que bloquea cualquier WRITE a las tablas de metadata desde
// requests HTTP normales. La autorización para cambiar metadata solo se
// concede al MIGRATION RUNNER, que setea
//   req.app.locals.allowMetadataChange = true
// antes de aplicar migraciones.
//
// Esto reemplaza al PG-only `SET LOCAL app.allow_metadata_change` que tenía
// v2.0. Ahora la protección vive en app-layer y funciona en los 6 DBMS
// (incluyendo Spanner, que no soporta triggers BD).
//
// ── Capa 2 (OPCIONAL, defensa-en-profundidad) ──
//
// En PG/Oracle/DB2/MySQL/SQL Server, ADEMÁS aplicamos triggers BD nativos
// (ver templates/db-adapters/<dbms>/triggers.sql). Estos son línea de
// defensa contra SQL directo (DBA, herramientas externas) y se aplican
// AUTOMATICAMENTE por el migration runner según el DBMS detectado.
// En Spanner, no hay triggers; queda solo la capa 1.

import { createProblem } from '../utils/problem.js';

/**
 * Set de tablas de metadata cuyos writes solo se permiten desde el migration
 * runner. Si añades tablas de metadata nuevas, agrégalas aquí.
 */
const TABLAS_METADATA_PROTEGIDAS = new Set([
  'tablas_sistema',
  'campos_sistema',
  'metadata_versiones',
  'procesos_sistema',
  'semaforos_sistema',
  'semaforos_gating',
  'variables_sistema',
  'componentes_sistema',
]);

/**
 * Path prefixes que mapean a las tablas de metadata. El middleware bloquea
 * writes a estos paths a menos que el migration runner haya activado
 * `allowMetadataChange`.
 */
const PATHS_PROTEGIDOS = [
  '/v1/tablas-sistema',
  '/v1/campos-sistema',
  '/v1/metadata-versiones',
  '/v1/procesos-sistema',
  '/v1/semaforos-sistema',
  '/v1/variables-sistema',
  '/v1/componentes-sistema',
];

const METODOS_ESCRITURA = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Middleware. Aplicar en app.js DESPUÉS de authenticate (necesita req.user)
 * pero ANTES de cualquier ruta que toque metadata.
 *
 * Uso:
 *   import { protectMetadata } from './middleware/protectMetadata.js';
 *   app.use(protectMetadata);
 */
export function protectMetadata(req, res, next) {
  // Lecturas siempre permitidas
  if (!METODOS_ESCRITURA.has(req.method)) return next();

  // Si NO es una ruta de metadata protegida, dejar pasar
  const esRutaProtegida = PATHS_PROTEGIDOS.some((p) =>
    req.path === p || req.path.startsWith(p + '/'),
  );
  if (!esRutaProtegida) return next();

  // Si el migration runner activó el bypass, dejar pasar
  if (req.app.locals.allowMetadataChange === true) return next();

  // Bloqueado: la metadata solo se modifica vía migraciones
  return res.status(403).json(
    createProblem(req, 403, 'metadata-immutable',
      'Las tablas de metadata son inmutables desde el API HTTP. ' +
      'Cambios solo via migraciones SQL aplicadas con el migration runner.',
    ),
  );
}

/**
 * Activa el bypass de manera atomic durante una callback. Usado SOLO por
 * el migration runner.
 *
 * Uso:
 *   await withMetadataChangeAllowed(app, async () => {
 *     // aplicar migraciones SQL
 *   });
 */
export async function withMetadataChangeAllowed(app, fn) {
  const previo = app.locals.allowMetadataChange;
  app.locals.allowMetadataChange = true;
  try {
    return await fn();
  } finally {
    app.locals.allowMetadataChange = previo;
  }
}

/**
 * Exporta la lista de tablas protegidas para que otros componentes
 * (admin tools, scripts) la consulten.
 */
export const TABLAS_PROTEGIDAS = TABLAS_METADATA_PROTEGIDAS;
