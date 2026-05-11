-- ============================================================
-- PostgreSQL — Triggers de protección de metadata (Capa 2)
-- ============================================================
--
-- Aplica AUTOMÁTICAMENTE por el migration runner cuando detecta
-- DB_DRIVER=postgres. Implementa defensa-en-profundidad sobre la
-- Capa 1 (middleware protectMetadata): bloquea writes SQL directos
-- a las tablas de metadata.
--
-- Bypass: el migration runner setea `app.allow_metadata_change = 'true'`
-- antes de aplicar migraciones. Cualquier OTRA sesión (DBA con psql,
-- herramienta externa, etc.) NO tiene el flag → trigger bloquea.
--
-- ============================================================
-- 1. FUNCIONES TRIGGER
-- ============================================================

-- Tabla totalmente inmutable — todo INSERT/UPDATE/DELETE bloqueado.
CREATE OR REPLACE FUNCTION trg_metadata_inmutable() RETURNS TRIGGER AS $$
BEGIN
    IF current_setting('app.allow_metadata_change', true) = 'true' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    RAISE EXCEPTION 'Tabla % es metadata inmutable. Cambios solo en migraciones.', TG_TABLE_NAME
        USING ERRCODE = '23514',
              HINT  = 'El migration runner setea app.allow_metadata_change=true automáticamente.';
END $$ LANGUAGE plpgsql;

-- Tabla con columnas inmutables — solo TG_ARGV[0] (CSV) puede cambiarse.
-- INSERT y DELETE siempre bloqueados.
CREATE OR REPLACE FUNCTION trg_metadata_proteger_columnas() RETURNS TRIGGER AS $$
DECLARE
    cols_mutables  text[];
    col_name       text;
    old_val        text;
    new_val        text;
BEGIN
    IF current_setting('app.allow_metadata_change', true) = 'true' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    IF TG_OP IN ('INSERT', 'DELETE') THEN
        RAISE EXCEPTION 'INSERT/DELETE en % requiere migración.', TG_TABLE_NAME
            USING ERRCODE = '23514';
    END IF;
    cols_mutables := string_to_array(TG_ARGV[0], ',');
    FOR col_name IN
        SELECT column_name FROM information_schema.columns
         WHERE table_name = TG_TABLE_NAME
    LOOP
        IF col_name = ANY(cols_mutables) THEN
            CONTINUE;
        END IF;
        EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', col_name, col_name)
            INTO old_val, new_val USING OLD, NEW;
        IF old_val IS DISTINCT FROM new_val THEN
            RAISE EXCEPTION 'Columna %.% es inmutable.', TG_TABLE_NAME, col_name
                USING ERRCODE = '23514';
        END IF;
    END LOOP;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

-- Bitácora de auditoría — solo INSERT permitido, UPDATE/DELETE bloqueados.
CREATE OR REPLACE FUNCTION trg_auditoria_no_modificar() RETURNS TRIGGER AS $$
BEGIN
    IF current_setting('app.allow_metadata_change', true) = 'true' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    RAISE EXCEPTION 'Tabla % es bitácora de auditoría: no permite UPDATE ni DELETE.', TG_TABLE_NAME
        USING ERRCODE = '23514';
END $$ LANGUAGE plpgsql;


-- ============================================================
-- 2. TRIGGERS EN TABLAS TOTALMENTE INMUTABLES
-- ============================================================

DROP TRIGGER IF EXISTS tablas_sistema_inmutable     ON tablas_sistema;
DROP TRIGGER IF EXISTS campos_sistema_inmutable     ON campos_sistema;
DROP TRIGGER IF EXISTS metadata_versiones_inmutable ON metadata_versiones;
DROP TRIGGER IF EXISTS semaforos_gating_inmutable   ON semaforos_gating;

CREATE TRIGGER tablas_sistema_inmutable
    BEFORE INSERT OR UPDATE OR DELETE ON tablas_sistema
    FOR EACH ROW EXECUTE FUNCTION trg_metadata_inmutable();

CREATE TRIGGER campos_sistema_inmutable
    BEFORE INSERT OR UPDATE OR DELETE ON campos_sistema
    FOR EACH ROW EXECUTE FUNCTION trg_metadata_inmutable();

CREATE TRIGGER metadata_versiones_inmutable
    BEFORE INSERT OR UPDATE OR DELETE ON metadata_versiones
    FOR EACH ROW EXECUTE FUNCTION trg_metadata_inmutable();

CREATE TRIGGER semaforos_gating_inmutable
    BEFORE INSERT OR UPDATE OR DELETE ON semaforos_gating
    FOR EACH ROW EXECUTE FUNCTION trg_metadata_inmutable();


-- ============================================================
-- 3. TRIGGERS EN TABLAS CON COLUMNAS MUTABLES PARCIALES
-- ============================================================

-- procesos_sistema: mutables = activo, ultima_ejecucion, proxima_ejecucion, ultima_duracion_ms
DROP TRIGGER IF EXISTS procesos_sistema_cols_inmutables ON procesos_sistema;
CREATE TRIGGER procesos_sistema_cols_inmutables
    BEFORE UPDATE ON procesos_sistema
    FOR EACH ROW EXECUTE FUNCTION trg_metadata_proteger_columnas('activo,ultima_ejecucion,proxima_ejecucion,ultima_duracion_ms');

-- semaforos_sistema: mutables = estado_actual, valor_actual, actualizado_en
DROP TRIGGER IF EXISTS semaforos_sistema_cols_inmutables ON semaforos_sistema;
CREATE TRIGGER semaforos_sistema_cols_inmutables
    BEFORE UPDATE ON semaforos_sistema
    FOR EACH ROW EXECUTE FUNCTION trg_metadata_proteger_columnas('estado_actual,valor_actual,actualizado_en');

-- variables_sistema: mutables = valor, modificado_en, modificado_por
DROP TRIGGER IF EXISTS variables_sistema_cols_inmutables ON variables_sistema;
CREATE TRIGGER variables_sistema_cols_inmutables
    BEFORE UPDATE ON variables_sistema
    FOR EACH ROW EXECUTE FUNCTION trg_metadata_proteger_columnas('valor,modificado_en,modificado_por');

-- componentes_sistema: mutables = activo
DROP TRIGGER IF EXISTS componentes_sistema_cols_inmutables ON componentes_sistema;
CREATE TRIGGER componentes_sistema_cols_inmutables
    BEFORE UPDATE ON componentes_sistema
    FOR EACH ROW EXECUTE FUNCTION trg_metadata_proteger_columnas('activo');

-- INSERT y DELETE en estas 4 tablas también bloqueados (la función ya lo hace)
DROP TRIGGER IF EXISTS procesos_sistema_no_insert_delete    ON procesos_sistema;
DROP TRIGGER IF EXISTS semaforos_sistema_no_insert_delete   ON semaforos_sistema;
DROP TRIGGER IF EXISTS variables_sistema_no_insert_delete   ON variables_sistema;
DROP TRIGGER IF EXISTS componentes_sistema_no_insert_delete ON componentes_sistema;
CREATE TRIGGER procesos_sistema_no_insert_delete
    BEFORE INSERT OR DELETE ON procesos_sistema
    FOR EACH ROW EXECUTE FUNCTION trg_metadata_inmutable();
CREATE TRIGGER semaforos_sistema_no_insert_delete
    BEFORE INSERT OR DELETE ON semaforos_sistema
    FOR EACH ROW EXECUTE FUNCTION trg_metadata_inmutable();
CREATE TRIGGER variables_sistema_no_insert_delete
    BEFORE INSERT OR DELETE ON variables_sistema
    FOR EACH ROW EXECUTE FUNCTION trg_metadata_inmutable();
CREATE TRIGGER componentes_sistema_no_insert_delete
    BEFORE INSERT OR DELETE ON componentes_sistema
    FOR EACH ROW EXECUTE FUNCTION trg_metadata_inmutable();


-- ============================================================
-- 4. TRIGGERS EN BITÁCORAS DE AUDITORÍA (insert-only)
-- ============================================================

DROP TRIGGER IF EXISTS variables_historia_inmutable ON variables_historia;
CREATE TRIGGER variables_historia_inmutable
    BEFORE UPDATE OR DELETE ON variables_historia
    FOR EACH ROW EXECUTE FUNCTION trg_auditoria_no_modificar();

-- (otras tablas con función=AUDITORIA se agregan aquí cuando se creen)
