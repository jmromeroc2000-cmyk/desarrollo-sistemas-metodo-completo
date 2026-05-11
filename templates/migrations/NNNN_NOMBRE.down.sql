-- ============================================================
-- Migración NNNN — <descripción corta> (DOWN)
-- Revierte el .up.sql correspondiente.
-- ============================================================
--
-- REVERSIBILIDAD: <COMPLETA | PARCIAL | NO REVERSIBLE>
--
--    COMPLETA       — restaura el state exacto previo al .up.sql
--    PARCIAL        — deshace schema pero NO restaura datos (ej: DROP COLUMN
--                     con datos perdidos)
--    NO REVERSIBLE  — descomentar el bloque "raise" abajo + documentar razón.
--                     El archivo .down.sql DEBE existir aunque sea no-reversible
--                     (el migration runner valida que existe).
--
-- ============================================================

-- ============================================================
-- CASO NO REVERSIBLE — uncomment + documentar:
-- ============================================================
--
-- Postgres / MySQL (SIGNAL SQLSTATE — DB2/MySQL) / RAISE_APPLICATION_ERROR (Oracle):
-- Esta sentencia depende del DBMS. Para portabilidad, una alternativa es:
--
--   INSERT INTO _migrations_no_reversible (num, motivo)
--   VALUES (NNNN, 'Drop column con datos perdidos. Restaurar desde respaldo.');
--
--   (Hace que el runner haga DELETE de _migrations en down — pero NO ejecuta
--    nada destructivo. El operador debe entender que el down es no-op.)
--
-- O bien, simplemente dejar comentado el contenido y agregar comentario:
--   "Esta migración no es reversible. Para revertir, restaurar desde respaldo
--    pre-NNNN. Run `node scripts/migrate.js down N-1` removerá la entrada en
--    _migrations pero no revertirá el cambio real."

-- ============================================================
-- 1. Eliminar metadata (orden inverso a .up.sql)
-- ============================================================

DELETE FROM metadata_versiones WHERE version = 'x.y.z';

DELETE FROM campos_sistema
    WHERE nombre_tabla = 'mi_tabla';

DELETE FROM tablas_sistema
    WHERE nombre_tabla = 'mi_tabla';

-- ============================================================
-- 2. Drop tablas/columnas/índices (orden inverso a .up.sql)
-- ============================================================

DROP TABLE mi_tabla;
