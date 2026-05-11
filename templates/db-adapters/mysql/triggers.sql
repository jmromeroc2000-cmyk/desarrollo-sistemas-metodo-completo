-- ============================================================
-- MySQL — Triggers de protección de metadata (Capa 2)
-- ============================================================
--
-- Aplica AUTOMÁTICAMENTE por el migration runner cuando detecta
-- DB_DRIVER=mysql. Implementa defensa-en-profundidad sobre la Capa 1
-- (middleware protectMetadata).
--
-- Bypass: el migration runner ejecuta SET @app_allow_metadata_change = 'true'
-- ANTES de cada migración. Las user variables MySQL son session-scoped y se
-- limpian al cerrar la conexión.
--
-- Limitaciones MySQL:
--   • UN solo trigger por evento por tabla. Si una tabla necesita lógica
--     en INSERT y UPDATE, son DOS triggers separados.
--   • No hay equivalente de SQLSTATE personalizado claro: usamos SIGNAL
--     SQLSTATE '45000' con MESSAGE_TEXT (estándar para errores de app).
--
-- ============================================================

DELIMITER //

-- ============================================================
-- 1. TABLAS TOTALMENTE INMUTABLES — tablas_sistema, campos_sistema,
--    metadata_versiones, semaforos_gating
-- ============================================================

DROP TRIGGER IF EXISTS tablas_sistema_bi //
CREATE TRIGGER tablas_sistema_bi BEFORE INSERT ON tablas_sistema FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT =
            'tablas_sistema es metadata inmutable. Cambios solo en migraciones.';
    END IF;
END //

DROP TRIGGER IF EXISTS tablas_sistema_bu //
CREATE TRIGGER tablas_sistema_bu BEFORE UPDATE ON tablas_sistema FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT =
            'tablas_sistema es metadata inmutable. Cambios solo en migraciones.';
    END IF;
END //

DROP TRIGGER IF EXISTS tablas_sistema_bd //
CREATE TRIGGER tablas_sistema_bd BEFORE DELETE ON tablas_sistema FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT =
            'tablas_sistema es metadata inmutable. Cambios solo en migraciones.';
    END IF;
END //

-- Mismo patrón triple (INSERT/UPDATE/DELETE) para campos_sistema:
DROP TRIGGER IF EXISTS campos_sistema_bi //
CREATE TRIGGER campos_sistema_bi BEFORE INSERT ON campos_sistema FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'campos_sistema inmutable.';
    END IF;
END //
DROP TRIGGER IF EXISTS campos_sistema_bu //
CREATE TRIGGER campos_sistema_bu BEFORE UPDATE ON campos_sistema FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'campos_sistema inmutable.';
    END IF;
END //
DROP TRIGGER IF EXISTS campos_sistema_bd //
CREATE TRIGGER campos_sistema_bd BEFORE DELETE ON campos_sistema FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'campos_sistema inmutable.';
    END IF;
END //

-- metadata_versiones:
DROP TRIGGER IF EXISTS metadata_versiones_bi //
CREATE TRIGGER metadata_versiones_bi BEFORE INSERT ON metadata_versiones FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'metadata_versiones inmutable.';
    END IF;
END //
DROP TRIGGER IF EXISTS metadata_versiones_bu //
CREATE TRIGGER metadata_versiones_bu BEFORE UPDATE ON metadata_versiones FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'metadata_versiones inmutable.';
    END IF;
END //
DROP TRIGGER IF EXISTS metadata_versiones_bd //
CREATE TRIGGER metadata_versiones_bd BEFORE DELETE ON metadata_versiones FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'metadata_versiones inmutable.';
    END IF;
END //

-- semaforos_gating:
DROP TRIGGER IF EXISTS semaforos_gating_bi //
CREATE TRIGGER semaforos_gating_bi BEFORE INSERT ON semaforos_gating FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'semaforos_gating inmutable.';
    END IF;
END //
DROP TRIGGER IF EXISTS semaforos_gating_bu //
CREATE TRIGGER semaforos_gating_bu BEFORE UPDATE ON semaforos_gating FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'semaforos_gating inmutable.';
    END IF;
END //
DROP TRIGGER IF EXISTS semaforos_gating_bd //
CREATE TRIGGER semaforos_gating_bd BEFORE DELETE ON semaforos_gating FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'semaforos_gating inmutable.';
    END IF;
END //


-- ============================================================
-- 2. TABLAS CON COLUMNAS MUTABLES PARCIALES
--    Patrón: comparar OLD.<col> vs NEW.<col> para cada columna inmutable.
-- ============================================================

-- procesos_sistema: mutables = activo, ultima_ejecucion, proxima_ejecucion, ultima_duracion_ms
DROP TRIGGER IF EXISTS procesos_sistema_bi //
CREATE TRIGGER procesos_sistema_bi BEFORE INSERT ON procesos_sistema FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INSERT en procesos_sistema requiere migración.';
    END IF;
END //
DROP TRIGGER IF EXISTS procesos_sistema_bd //
CREATE TRIGGER procesos_sistema_bd BEFORE DELETE ON procesos_sistema FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DELETE en procesos_sistema requiere migración.';
    END IF;
END //
DROP TRIGGER IF EXISTS procesos_sistema_bu //
CREATE TRIGGER procesos_sistema_bu BEFORE UPDATE ON procesos_sistema FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        -- Verificar que solo cambiaron columnas mutables
        IF NOT (OLD.codigo            <=> NEW.codigo)            OR
           NOT (OLD.descripcion       <=> NEW.descripcion)       OR
           NOT (OLD.frecuencia        <=> NEW.frecuencia)        OR
           NOT (OLD.mensaje_ayuda     <=> NEW.mensaje_ayuda)     OR
           NOT (OLD.nota_admin        <=> NEW.nota_admin)        OR
           NOT (OLD.nota_programador  <=> NEW.nota_programador)  OR
           NOT (OLD.nota_operador     <=> NEW.nota_operador)
        THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT =
                'procesos_sistema: solo activo/ultima_ejecucion/proxima_ejecucion/ultima_duracion_ms son mutables.';
        END IF;
    END IF;
END //

-- semaforos_sistema: mutables = estado_actual, valor_actual, actualizado_en
DROP TRIGGER IF EXISTS semaforos_sistema_bi //
CREATE TRIGGER semaforos_sistema_bi BEFORE INSERT ON semaforos_sistema FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INSERT en semaforos_sistema requiere migración.';
    END IF;
END //
DROP TRIGGER IF EXISTS semaforos_sistema_bd //
CREATE TRIGGER semaforos_sistema_bd BEFORE DELETE ON semaforos_sistema FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DELETE en semaforos_sistema requiere migración.';
    END IF;
END //
DROP TRIGGER IF EXISTS semaforos_sistema_bu //
CREATE TRIGGER semaforos_sistema_bu BEFORE UPDATE ON semaforos_sistema FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        IF NOT (OLD.codigo            <=> NEW.codigo)            OR
           NOT (OLD.descripcion       <=> NEW.descripcion)       OR
           NOT (OLD.sentido           <=> NEW.sentido)           OR
           NOT (OLD.fuente_datos      <=> NEW.fuente_datos)      OR
           NOT (OLD.umbral_verde_max  <=> NEW.umbral_verde_max)  OR
           NOT (OLD.umbral_amarillo_max <=> NEW.umbral_amarillo_max)
        THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT =
                'semaforos_sistema: solo estado_actual/valor_actual/actualizado_en son mutables.';
        END IF;
    END IF;
END //

-- variables_sistema: mutables = valor, modificado_en, modificado_por
DROP TRIGGER IF EXISTS variables_sistema_bi //
CREATE TRIGGER variables_sistema_bi BEFORE INSERT ON variables_sistema FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INSERT en variables_sistema requiere migración.';
    END IF;
END //
DROP TRIGGER IF EXISTS variables_sistema_bd //
CREATE TRIGGER variables_sistema_bd BEFORE DELETE ON variables_sistema FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DELETE en variables_sistema requiere migración.';
    END IF;
END //
DROP TRIGGER IF EXISTS variables_sistema_bu //
CREATE TRIGGER variables_sistema_bu BEFORE UPDATE ON variables_sistema FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        IF NOT (OLD.clave              <=> NEW.clave)              OR
           NOT (OLD.valor_defecto      <=> NEW.valor_defecto)      OR
           NOT (OLD.tipo_dato          <=> NEW.tipo_dato)          OR
           NOT (OLD.roles_modificacion <=> NEW.roles_modificacion) OR
           NOT (OLD.roles_lectura      <=> NEW.roles_lectura)      OR
           NOT (OLD.valores_posibles   <=> NEW.valores_posibles)
        THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT =
                'variables_sistema: solo valor/modificado_en/modificado_por son mutables.';
        END IF;
    END IF;
END //

-- componentes_sistema: mutables = activo
DROP TRIGGER IF EXISTS componentes_sistema_bi //
CREATE TRIGGER componentes_sistema_bi BEFORE INSERT ON componentes_sistema FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INSERT en componentes_sistema requiere migración.';
    END IF;
END //
DROP TRIGGER IF EXISTS componentes_sistema_bd //
CREATE TRIGGER componentes_sistema_bd BEFORE DELETE ON componentes_sistema FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DELETE en componentes_sistema requiere migración.';
    END IF;
END //
DROP TRIGGER IF EXISTS componentes_sistema_bu //
CREATE TRIGGER componentes_sistema_bu BEFORE UPDATE ON componentes_sistema FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        IF NOT (OLD.codigo      <=> NEW.codigo)      OR
           NOT (OLD.nombre      <=> NEW.nombre)      OR
           NOT (OLD.categoria   <=> NEW.categoria)   OR
           NOT (OLD.version     <=> NEW.version)
        THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT =
                'componentes_sistema: solo activo es mutable.';
        END IF;
    END IF;
END //


-- ============================================================
-- 3. BITÁCORAS DE AUDITORÍA — insert-only
-- ============================================================

DROP TRIGGER IF EXISTS variables_historia_bu //
CREATE TRIGGER variables_historia_bu BEFORE UPDATE ON variables_historia FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT =
            'variables_historia es bitácora: no permite UPDATE.';
    END IF;
END //

DROP TRIGGER IF EXISTS variables_historia_bd //
CREATE TRIGGER variables_historia_bd BEFORE DELETE ON variables_historia FOR EACH ROW
BEGIN
    IF COALESCE(@app_allow_metadata_change, 'false') <> 'true' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT =
            'variables_historia es bitácora: no permite DELETE.';
    END IF;
END //

DELIMITER ;
