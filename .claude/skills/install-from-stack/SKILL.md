---
name: install-from-stack-bootstrap-entorno
description: >
  Activar para generar el bootstrap del entorno (package.json + .env.example
  + scripts) derivados de componentes_sistema. Lee la categoría INFRAESTRUCTURA,
  BACKEND, FRONTEND y PRUEBAS y produce la configuración correspondiente con
  versiones exactas. Genera scripts de instalación reproducibles.
  Comandos de activación: /install-from-stack
---

# SKILL — Instalación derivada del stack declarado (Fase 4)

**Fase del método:** 4 (instalación)
**Modo asociado:** `/dev`
**Activación:** `/install-from-stack`

## Pre-condiciones

- Fase 3 completa: `componentes_sistema` poblada
- Acceso de escritura a `Dev/` y `Dev/frontend/`

## Pasos

1. **Leer stack declarado**:
   ```sql
   SELECT codigo, nombre, categoria, subcategoria, version, licencia
     FROM componentes_sistema WHERE activo=1
    ORDER BY categoria, codigo;
   ```

2. **Derivar `Dev/package.json`** desde categoría BACKEND + PRUEBAS:
   ```json
   {
     "name": "<proyecto>",
     "version": "1.0.0",
     "type": "module",
     "engines": { "node": ">=20.0.0" },
     "dependencies": {
       "express": "^4.x",
       "pg": "^8.x",
       "jsonwebtoken": "^9.x",
       "bcryptjs": "^2.x",
       "pino": "^9.x",
       "dotenv": "^16.x",
       "express-rate-limit": "^7.x"
     },
     "devDependencies": {
       "vitest": "^4.x",
       "supertest": "^7.x",
       "@vitest/coverage-v8": "^4.x"
     },
     "scripts": {
       "dev": "concurrently -n back,front -c blue,magenta \"npm:dev:back\" \"npm:dev:front\"",
       "dev:back": "node --watch server.js",
       "dev:front": "npm --prefix frontend run dev",
       "test": "vitest run",
       "test:watch": "vitest",
       "test:coverage": "vitest run --coverage",
       "migrate": "node scripts/migrate.js",
       "seed:dev": "node scripts/seed-dev-admin.js",
       "generate-keys": "node scripts/generate-keys.js"
     }
   }
   ```

3. **Derivar `Dev/frontend/package.json`** desde categoría FRONTEND + PRUEBAS:
   ```json
   {
     "name": "<proyecto>-frontend",
     "type": "module",
     "scripts": {
       "dev": "vite",
       "build": "tsc -b && vite build",
       "typecheck": "tsc --noEmit",
       "lint": "eslint . --max-warnings=0",
       "test": "vitest run",
       "test:e2e": "playwright test",
       "test:e2e:smoke": "playwright test --grep @smoke",
       "test:a11y": "playwright test --grep @a11y",
       "preflight": "node scripts/validate-frontend.js && knip --strict",
       "audit:states": "node scripts/audit-states.js",
       "tokens:build": "style-dictionary build",
       "gen:catalog": "plop catalog"
     }
   }
   ```

4. **Generar `.env.example`** desde `variables_sistema` con
   `requiere_reinicio=1`:
   ```bash
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=<nombre_proyecto>_dev
   DB_USER=<usuario>
   DB_PASSWORD=<password>

   # JWT
   JWT_PRIVATE_KEY_PATH=./keys/private.key
   JWT_PUBLIC_KEY_PATH=./keys/public.key
   JWT_ACCESS_EXPIRY=15m
   JWT_REFRESH_EXPIRY=7d

   # Redis (solo si componentes_sistema declara REDIS)
   REDIS_URL=redis://localhost:6379

   # System
   SYSTEM_MODE=PERFORMANCE  # DEBUG | PERFORMANCE | MAINTENANCE
   ```

5. **Generar `Dev/scripts/install.sh`** (idempotente):
   ```bash
   #!/usr/bin/env bash
   set -euo pipefail

   echo "[1/5] Instalando dependencias backend..."
   npm install --prefix Dev

   echo "[2/5] Instalando dependencias frontend..."
   npm install --prefix Dev/frontend

   echo "[3/5] Generando llaves JWT..."
   npm run generate-keys --prefix Dev

   echo "[4/5] Aplicando 11 migraciones bootstrap..."
   for f in Dev/migrations/[0-9]*.sql; do
     PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f "$f"
   done

   echo "[5/5] Sembrando admin de Dev..."
   npm run seed:dev --prefix Dev

   echo "✓ Instalación completa."
   ```

6. **Listar dependencias EXACTAS** según `componentes_sistema.version`:
   - Si `componentes_sistema` declara `pino` versión 9.5, usar `^9.5.0`
   - Si declara nginx 1.26, mencionar en `.env.example` o doc 25
   - Cualquier desviación se documenta como deuda

## Output esperado

- `Dev/package.json` y `Dev/frontend/package.json` consistentes con
  `componentes_sistema`
- `Dev/.env.example` con todas las variables de
  `variables_sistema` con `sensible=0`
- `Dev/scripts/install.sh` idempotente
- Validación de versiones declaradas vs disponibles en npm

## Verificación

```bash
# Diff entre componentes_sistema y package.json
psql -c "SELECT codigo, version FROM componentes_sistema
          WHERE categoria='BACKEND' AND activo=1" \
  | diff - <(jq -r '.dependencies | to_entries[] | "\(.key) \(.value)"' Dev/package.json)

# Instalación funciona
bash Dev/scripts/install.sh
```

## Reglas

- ✗ Instalar paquetes que NO estén en `componentes_sistema`
- ✗ Usar versiones distintas a las declaradas (sin justificación)
- ✓ `.env.example` NUNCA contiene secretos reales
- ✓ Las llaves se generan localmente, no se versionan
