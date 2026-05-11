#!/usr/bin/env bash
# templates/bootstrap.sh
# Copy a: bootstrap.sh (root del proyecto)
# Uso: bash bootstrap.sh
#
# Idempotente: corrible múltiples veces sin romper.
# Orden crítico — saltar pasos da errores opacos.

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "═══════════════════════════════════════════════"
echo "  Bootstrap del sistema desde cero"
echo "═══════════════════════════════════════════════"
echo

# ───────────────────────────────────────────────────────────
# 1. Pre-requisitos: BD + Node + npm
# ───────────────────────────────────────────────────────────

echo "▶ 1/7  Verificando pre-requisitos..."

command -v node >/dev/null 2>&1 || { echo "  ❌ node no instalado"; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "  ❌ npm no instalado"; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "  ❌ psql no instalado"; exit 1; }
command -v git  >/dev/null 2>&1 || { echo "  ❌ git no instalado"; exit 1; }

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
[ "$NODE_VER" -ge 20 ] || { echo "  ❌ node $NODE_VER < 20"; exit 1; }

echo "  ✓ node $(node -v), npm $(npm -v), psql $(psql --version | head -1)"

# ───────────────────────────────────────────────────────────
# 2. .env (si no existe, copiar .env.example)
# ───────────────────────────────────────────────────────────

echo
echo "▶ 2/7  Configuración del entorno..."

if [ ! -f "$ROOT/Dev/.env" ]; then
  if [ -f "$ROOT/Dev/.env.example" ]; then
    cp "$ROOT/Dev/.env.example" "$ROOT/Dev/.env"
    echo "  ⚠ .env creado desde .env.example. Edita los valores antes de continuar."
    echo "     vim $ROOT/Dev/.env"
    exit 1
  else
    echo "  ❌ Falta Dev/.env.example"
    exit 1
  fi
fi

# Cargar .env
set -a
. "$ROOT/Dev/.env"
set +a
echo "  ✓ Dev/.env cargado"

# ───────────────────────────────────────────────────────────
# 3. BD: crear si no existe
# ───────────────────────────────────────────────────────────

echo
echo "▶ 3/7  Base de datos..."

DB_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -tAc \
  "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" postgres 2>/dev/null || true)

if [ "$DB_EXISTS" != "1" ]; then
  echo "  → Creando BD $DB_NAME..."
  PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -U "$DB_USER" "$DB_NAME"
fi
echo "  ✓ BD $DB_NAME existe"

# ───────────────────────────────────────────────────────────
# 4. Deps backend
# ───────────────────────────────────────────────────────────

echo
echo "▶ 4/7  Instalando deps backend..."
cd "$ROOT/Dev"
npm ci --no-audit --no-fund

# ───────────────────────────────────────────────────────────
# 5. Generar claves JWT (si no existen)
# ───────────────────────────────────────────────────────────

echo
echo "▶ 5/7  Generando claves JWT..."
if [ ! -f "$ROOT/Dev/keys/private.key" ] || [ ! -f "$ROOT/Dev/keys/public.key" ]; then
  cd "$ROOT/Dev" && npm run generate-keys
else
  echo "  ✓ Claves JWT ya existen"
fi

# ───────────────────────────────────────────────────────────
# 6. Aplicar migraciones (UP)
# ───────────────────────────────────────────────────────────

echo
echo "▶ 6/7  Aplicando migraciones..."
cd "$ROOT/Dev"
npm run migrate

# ───────────────────────────────────────────────────────────
# 7. Frontend deps + snapshot + codegen
# ───────────────────────────────────────────────────────────

echo
echo "▶ 7/7  Frontend..."
if [ -d "$ROOT/Dev/frontend" ]; then
  cd "$ROOT/Dev/frontend"
  npm ci --no-audit --no-fund
  npm run meta:snapshot 2>/dev/null || echo "  (skip: meta:snapshot no configurado todavía)"
  npm run meta:types    2>/dev/null || echo "  (skip: meta:types no configurado todavía)"
  npm run msw:gen       2>/dev/null || echo "  (skip: msw:gen no configurado todavía)"
fi

# ───────────────────────────────────────────────────────────
# Final
# ───────────────────────────────────────────────────────────

echo
echo "═══════════════════════════════════════════════"
echo "  ✓ Bootstrap completo."
echo "═══════════════════════════════════════════════"
echo
echo "Próximos pasos:"
echo "  cd Dev && npm run dev:full     # backend + frontend en paralelo"
echo "  Abrir http://localhost:5173    # frontend dev"
echo "  curl http://localhost:3001/health  # backend health check"
echo
