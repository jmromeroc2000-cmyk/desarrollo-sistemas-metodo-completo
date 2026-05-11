#!/usr/bin/env bash
# orphan-migration-check.sh
# Bloquea commits que tienen un patrón de regresión silenciosa:
#   migraciones untracked + src/** modificado en el mismo workspace
#
# Por qué importa:
#   Si el agente aplica una migración a su BD local (lo que cambia triggers/
#   schemas) y modifica el service que depende de esos cambios — pero olvida
#   git-add la migración — el CI puede pasar verde por casualidad (la BD test
#   tiene los cambios), pero un checkout fresco rompería.
#
# Comportamiento:
#   - Detecta migraciones NUEVAS (untracked + staged) en Dev/migrations/
#   - Detecta archivos backend modificados (Dev/src/, Dev/tests/)
#   - Si hay UNTRACKED migraciones + STAGED src/tests → bloquea con mensaje
#   - Si TODAS las migraciones están staged → permite (caso correcto)
#   - Salida 0 = permitir commit; salida 1 = bloquear
#
# Bypass intencional: `git commit --no-verify` (NO recomendado, deja huella).

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# Migraciones untracked (existen en disco, NO en git)
UNTRACKED_MIGS=$(git ls-files --others --exclude-standard Dev/migrations/ 2>/dev/null | grep -E '\.sql$' || true)

# Backend modificado y staged
STAGED_BACKEND=$(git diff --cached --name-only -- 'Dev/src/' 'Dev/tests/' 2>/dev/null || true)

if [ -n "$UNTRACKED_MIGS" ] && [ -n "$STAGED_BACKEND" ]; then
    echo ""
    echo "❌ orphan-migration-check: REGRESIÓN SILENCIOSA DETECTADA"
    echo ""
    echo "Tienes migraciones NUEVAS sin staged junto a cambios de backend:"
    echo ""
    echo "  Migraciones untracked:"
    echo "$UNTRACKED_MIGS" | sed 's/^/    /'
    echo ""
    echo "  Backend staged:"
    echo "$STAGED_BACKEND" | sed 's/^/    /'
    echo ""
    echo "Razón:"
    echo "  Tu BD local tiene los cambios de las migraciones aplicados, así que"
    echo "  los tests locales pasan. Pero los archivos .sql NO están en git —"
    echo "  un fresh checkout (CI o producción) NO podría reproducir la BD."
    echo ""
    echo "Soluciones:"
    echo "  1. Si las migraciones forman parte de este commit:"
    echo "       git add Dev/migrations/0XX_*.sql"
    echo "  2. Si NO forman parte (son work-in-progress):"
    echo "       git stash --include-untracked    # las guarda aparte"
    echo "  3. Bypass explícito (NO recomendado):"
    echo "       git commit --no-verify"
    echo ""
    exit 1
fi

exit 0
