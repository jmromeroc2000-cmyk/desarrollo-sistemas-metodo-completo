// templates/backend/logger.js
// Copy a: Dev/src/utils/logger.js
//
// Logger pino con contexto estructurado obligatorio.
// Interfaz: logger.{info|warn|error|debug}(message, context_obj)
// context_obj debe incluir cuando esté disponible:
//   - request_id (correlation ID del middleware)
//   - user_id
//   - agent (backend|frontend|infra|user — el agente que disparó la acción)
//   - operation (nombre del use case si aplica)
//
// Redacción automática: campos sensibles (password, token, secret, jwt)
// se enmascaran. Lista extensible vía .env LOG_REDACT_FIELDS.

import pino from 'pino';

const DEFAULT_REDACT = [
  'password',
  'passwordHash',
  'password_hash',
  'token',
  'refresh_token',
  'access_token',
  'authorization',
  'jwt',
  'secret',
  'api_key',
  '*.password',
  '*.token',
  '*.secret',
];

const extraRedact = (process.env.LOG_REDACT_FIELDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [...DEFAULT_REDACT, ...extraRedact],
    censor: '[REDACTED]',
  },
  formatters: {
    // Asegura que TODOS los logs tienen `mode` (SYSTEM_MODE) y `version`
    bindings: () => ({
      mode: process.env.SYSTEM_MODE || 'DEBUG',
    }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // En dev: pretty. En prod: JSON raw.
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' },
    },
  }),
});

/**
 * Crea un child logger con contexto baseline (típicamente per-request).
 * Usage:
 *   const log = childLogger({ request_id, user_id });
 *   log.info('operation X', { operation: 'createProducto', producto_id });
 */
export function childLogger(baseContext) {
  return logger.child(baseContext);
}

/**
 * Middleware de Express que crea child logger con request_id en req.log.
 * Usado junto con un middleware de correlation-id que setea req.id.
 */
export function loggerMiddleware(req, res, next) {
  req.log = childLogger({
    request_id: req.id || 'no-id',
    user_id:    req.user?.id || 'anon',
    method:     req.method,
    path:       req.path,
  });
  next();
}
