// templates/backend/health.js
// Copy a: Dev/src/health.js
//
// Endpoint /health formalizado en el método (CLAUDE.md §13.4c + §5.1.2.F).
//
// Shape obligatorio:
//   GET /health → 200 (siempre, incluso con BD down — caller distingue por body.db)
//   {
//     status:    'ok' | 'degraded' | 'down',
//     version:   '<package.json version>',
//     uptime_s:  <number, segundos>,
//     timestamp: '<ISO>',
//     db:        'ok' | 'down',
//     redis:     'ok' | 'down' | 'disabled',
//     mode:      'DEBUG' | 'PERFORMANCE' | 'MAINTENANCE'
//   }
//
// SIN auth (es el endpoint que CI/orchestrators usan para wait-for-ready).
// SIN maintenanceGuard (sirve incluso en MAINTENANCE para confirmar status).

import { Router } from 'express';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
const APP_START = Date.now();

export default function createHealthRouter({ pool, redis }) {
  const router = Router();

  router.get('/health', async (req, res) => {
    const checks = { db: 'down', redis: 'disabled' };

    try {
      await pool.query('SELECT 1');
      checks.db = 'ok';
    } catch {
      checks.db = 'down';
    }

    if (redis) {
      try {
        await redis.ping();
        checks.redis = 'ok';
      } catch {
        checks.redis = 'down';
      }
    }

    const overall =
      checks.db === 'ok' && (checks.redis === 'ok' || checks.redis === 'disabled')
        ? 'ok'
        : checks.db === 'ok'
          ? 'degraded'
          : 'down';

    res.status(200).json({
      status:    overall,
      version:   pkg.version,
      uptime_s:  Math.round((Date.now() - APP_START) / 1000),
      timestamp: new Date().toISOString(),
      db:        checks.db,
      redis:     checks.redis,
      mode:      process.env.SYSTEM_MODE || 'DEBUG',
    });
  });

  return router;
}
