-- ============================================================
-- Migración NNNN — <NOMBRE> (DOWN)
-- Fecha: YYYY-MM-DD
-- ============================================================
--
-- Revierte: NNNN_<NOMBRE>.up.sql
--
-- Reversibilidad: <COMPLETA | PARCIAL | NO REVERSIBLE>
--   - COMPLETA: restaura el state exacto previo al up.
--   - PARCIAL: deshace schema pero NO restaura datos (ej: DROP COLUMN
--     con datos perdidos).
--   - NO REVERSIBLE: incluir RAISE EXCEPTION abajo + razón documentada.
--
-- ============================================================

BEGIN;

SET LOCAL app.allow_metadata_change = 'true';

-- ============================================================
-- CASO NO REVERSIBLE — descomentar y documentar razón:
-- ============================================================
--
-- DO $$ BEGIN
--   RAISE EXCEPTION 'No reversible: <razón>. Para revertir, restaurar desde respaldo.';
-- END $$;
-- ROLLBACK;
-- (resto del archivo no se ejecuta)

-- ============================================================
-- PARTE 3 — Eliminar bump de metadata_versiones
-- ============================================================

DELETE FROM metadata_versiones WHERE version = 'x.y.z';

-- ============================================================
-- PARTE 2 — Eliminar filas de campos_sistema (si .up agregó)
-- ============================================================

-- DELETE FROM campos_sistema WHERE nombre_tabla=X AND nombre_campo IN (...);

-- ============================================================
-- PARTE 1 — Revertir DDL
-- ============================================================

-- DROP COLUMN / DROP TABLE / etc.

COMMIT;
