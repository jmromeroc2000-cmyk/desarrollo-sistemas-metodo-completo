-- ============================================================
-- Migración NNNN — <NOMBRE>
-- Fecha: YYYY-MM-DD
-- ============================================================
--
-- Objetivo: <una línea>
--
-- Tablas afectadas: <lista>
-- Bump metadata: x.y.z → x.y.(z+1)   (PATCH: cosmético, MINOR: tabla/col nueva, MAJOR: breaking)
--
-- ============================================================

BEGIN;

SET LOCAL app.allow_metadata_change = 'true';

-- ============================================================
-- PARTE 1 — DDL
-- ============================================================

-- <ALTER TABLE / CREATE TABLE / etc.>

-- ============================================================
-- PARTE 2 — Metadata: filas en campos_sistema (si aplica)
-- ============================================================

-- INSERT INTO campos_sistema (...) VALUES (...);

-- ============================================================
-- PARTE 3 — Bump metadata_versiones
-- ============================================================

INSERT INTO metadata_versiones
  (version, fecha, niveles, tablas_incluidas, descripcion,
   mensaje_ayuda, nota_admin, nota_programador, nota_operador)
VALUES
  ('x.y.z', 'YYYY-MM-DD', '1,2,...', N,
   '<una línea descriptiva>',
   '<para admin>',
   '<para programador>',
   '<para operador>',
   '<para usuario final>');

COMMIT;
