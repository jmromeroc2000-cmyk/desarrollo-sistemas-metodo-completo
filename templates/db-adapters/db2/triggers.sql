-- ============================================================
-- IBM DB2 LUW — Triggers de protección de metadata (Capa 2)
-- ============================================================
--
-- Aplica AUTOMÁTICAMENTE por el migration runner cuando detecta
-- DB_DRIVER=db2. Implementa defensa-en-profundidad sobre la
-- Capa 1 (middleware protectMetadata).
--
-- Bypass: DB2 LUW v9.7+ y z/OS soportan GLOBAL VARIABLES con scope de
-- sesión. El runner ejecuta ANTES de cada migración:
--     SET app_allow_metadata_change = 'true';
-- La variable se reinicia automáticamente al final de la sesión.
--
-- Sintaxis SQL/PL:
--   • Cada CREATE TRIGGER termina con @@@ (statement terminator alterno)
--   • El runner detecta @@@ para separar statements al enviar a DB2
--   • SIGNAL SQLSTATE '75000' (rango user-defined permitido en DB2)
-- ============================================================

-- ============================================================
-- 0. GLOBAL VARIABLE PARA EL BYPASS
-- ============================================================

CREATE OR REPLACE VARIABLE app_allow_metadata_change VARCHAR(10) DEFAULT 'false'@@@


-- ============================================================
-- 1. TABLAS TOTALMENTE INMUTABLES
-- ============================================================

CREATE OR REPLACE TRIGGER trg_tablas_sistema_inmutable
NO CASCADE BEFORE INSERT OR UPDATE OR DELETE ON tablas_sistema
REFERENCING NEW AS N OLD AS O
FOR EACH ROW
BEGIN ATOMIC
    IF app_allow_metadata_change <> 'true' THEN
        SIGNAL SQLSTATE '75001'
            SET MESSAGE_TEXT = 'tablas_sistema es metadata inmutable. Cambios solo en migraciones.';
    END IF;
END@@@

CREATE OR REPLACE TRIGGER trg_campos_sistema_inmutable
NO CASCADE BEFORE INSERT OR UPDATE OR DELETE ON campos_sistema
REFERENCING NEW AS N OLD AS O
FOR EACH ROW
BEGIN ATOMIC
    IF app_allow_metadata_change <> 'true' THEN
        SIGNAL SQLSTATE '75002'
            SET MESSAGE_TEXT = 'campos_sistema es metadata inmutable. Cambios solo en migraciones.';
    END IF;
END@@@

CREATE OR REPLACE TRIGGER trg_metadata_versiones_inmutable
NO CASCADE BEFORE INSERT OR UPDATE OR DELETE ON metadata_versiones
REFERENCING NEW AS N OLD AS O
FOR EACH ROW
BEGIN ATOMIC
    IF app_allow_metadata_change <> 'true' THEN
        SIGNAL SQLSTATE '75003'
            SET MESSAGE_TEXT = 'metadata_versiones inmutable. Solo INSERT desde migraciones.';
    END IF;
END@@@

CREATE OR REPLACE TRIGGER trg_semaforos_gating_inmutable
NO CASCADE BEFORE INSERT OR UPDATE OR DELETE ON semaforos_gating
REFERENCING NEW AS N OLD AS O
FOR EACH ROW
BEGIN ATOMIC
    IF app_allow_metadata_change <> 'true' THEN
        SIGNAL SQLSTATE '75004'
            SET MESSAGE_TEXT = 'semaforos_gating es metadata inmutable. Cambios solo en migraciones.';
    END IF;
END@@@


-- ============================================================
-- 2. TABLAS CON COLUMNAS MUTABLES PARCIALES
-- ============================================================

-- procesos_sistema: mutables = activo, ultima_ejecucion, proxima_ejecucion, ultima_duracion_ms
CREATE OR REPLACE TRIGGER trg_procesos_sistema_protect
NO CASCADE BEFORE INSERT OR UPDATE OR DELETE ON procesos_sistema
REFERENCING NEW AS N OLD AS O
FOR EACH ROW
BEGIN ATOMIC
    DECLARE v_op CHAR(1);

    IF app_allow_metadata_change = 'true' THEN
        RETURN;
    END IF;

    -- Detectar operación
    IF (O.codigo IS NULL AND N.codigo IS NOT NULL) THEN SET v_op = 'I';
    ELSEIF (O.codigo IS NOT NULL AND N.codigo IS NULL) THEN SET v_op = 'D';
    ELSE SET v_op = 'U';
    END IF;

    IF v_op IN ('I','D') THEN
        SIGNAL SQLSTATE '75010'
            SET MESSAGE_TEXT = 'INSERT/DELETE en procesos_sistema requiere migración.';
    END IF;

    -- UPDATE: validar inmutables
    IF COALESCE(N.codigo,'~')          <> COALESCE(O.codigo,'~')           OR
       COALESCE(N.descripcion,'~')     <> COALESCE(O.descripcion,'~')      OR
       COALESCE(N.frecuencia,'~')      <> COALESCE(O.frecuencia,'~')       OR
       COALESCE(N.mensaje_ayuda,'~')   <> COALESCE(O.mensaje_ayuda,'~')    OR
       COALESCE(N.nota_admin,'~')      <> COALESCE(O.nota_admin,'~')       OR
       COALESCE(N.nota_programador,'~') <> COALESCE(O.nota_programador,'~') OR
       COALESCE(N.nota_operador,'~')   <> COALESCE(O.nota_operador,'~')
    THEN
        SIGNAL SQLSTATE '75011'
            SET MESSAGE_TEXT = 'procesos_sistema: solo activo/ultima_ejecucion/proxima_ejecucion/ultima_duracion_ms son mutables.';
    END IF;
END@@@

-- semaforos_sistema: mutables = estado_actual, valor_actual, actualizado_en
CREATE OR REPLACE TRIGGER trg_semaforos_sistema_protect
NO CASCADE BEFORE INSERT OR UPDATE OR DELETE ON semaforos_sistema
REFERENCING NEW AS N OLD AS O
FOR EACH ROW
BEGIN ATOMIC
    DECLARE v_op CHAR(1);

    IF app_allow_metadata_change = 'true' THEN
        RETURN;
    END IF;

    IF (O.codigo IS NULL AND N.codigo IS NOT NULL) THEN SET v_op = 'I';
    ELSEIF (O.codigo IS NOT NULL AND N.codigo IS NULL) THEN SET v_op = 'D';
    ELSE SET v_op = 'U';
    END IF;

    IF v_op IN ('I','D') THEN
        SIGNAL SQLSTATE '75020'
            SET MESSAGE_TEXT = 'INSERT/DELETE en semaforos_sistema requiere migración.';
    END IF;

    IF COALESCE(N.codigo,'~')                <> COALESCE(O.codigo,'~')                OR
       COALESCE(N.descripcion,'~')           <> COALESCE(O.descripcion,'~')           OR
       COALESCE(N.sentido,'~')               <> COALESCE(O.sentido,'~')               OR
       COALESCE(N.fuente_datos,'~')          <> COALESCE(O.fuente_datos,'~')          OR
       COALESCE(N.umbral_verde_max,-999)     <> COALESCE(O.umbral_verde_max,-999)     OR
       COALESCE(N.umbral_amarillo_max,-999)  <> COALESCE(O.umbral_amarillo_max,-999)
    THEN
        SIGNAL SQLSTATE '75021'
            SET MESSAGE_TEXT = 'semaforos_sistema: solo estado_actual/valor_actual/actualizado_en son mutables.';
    END IF;
END@@@

-- variables_sistema: mutables = valor, modificado_en, modificado_por
CREATE OR REPLACE TRIGGER trg_variables_sistema_protect
NO CASCADE BEFORE INSERT OR UPDATE OR DELETE ON variables_sistema
REFERENCING NEW AS N OLD AS O
FOR EACH ROW
BEGIN ATOMIC
    DECLARE v_op CHAR(1);

    IF app_allow_metadata_change = 'true' THEN
        RETURN;
    END IF;

    IF (O.clave IS NULL AND N.clave IS NOT NULL) THEN SET v_op = 'I';
    ELSEIF (O.clave IS NOT NULL AND N.clave IS NULL) THEN SET v_op = 'D';
    ELSE SET v_op = 'U';
    END IF;

    IF v_op IN ('I','D') THEN
        SIGNAL SQLSTATE '75030'
            SET MESSAGE_TEXT = 'INSERT/DELETE en variables_sistema requiere migración.';
    END IF;

    IF COALESCE(N.clave,'~')              <> COALESCE(O.clave,'~')              OR
       COALESCE(N.valor_defecto,'~')      <> COALESCE(O.valor_defecto,'~')      OR
       COALESCE(N.tipo_dato,'~')          <> COALESCE(O.tipo_dato,'~')          OR
       COALESCE(N.roles_modificacion,'~') <> COALESCE(O.roles_modificacion,'~') OR
       COALESCE(N.roles_lectura,'~')      <> COALESCE(O.roles_lectura,'~')      OR
       COALESCE(N.valores_posibles,'~')   <> COALESCE(O.valores_posibles,'~')
    THEN
        SIGNAL SQLSTATE '75031'
            SET MESSAGE_TEXT = 'variables_sistema: solo valor/modificado_en/modificado_por son mutables.';
    END IF;
END@@@

-- componentes_sistema: mutables = activo
CREATE OR REPLACE TRIGGER trg_componentes_sistema_protect
NO CASCADE BEFORE INSERT OR UPDATE OR DELETE ON componentes_sistema
REFERENCING NEW AS N OLD AS O
FOR EACH ROW
BEGIN ATOMIC
    DECLARE v_op CHAR(1);

    IF app_allow_metadata_change = 'true' THEN
        RETURN;
    END IF;

    IF (O.codigo IS NULL AND N.codigo IS NOT NULL) THEN SET v_op = 'I';
    ELSEIF (O.codigo IS NOT NULL AND N.codigo IS NULL) THEN SET v_op = 'D';
    ELSE SET v_op = 'U';
    END IF;

    IF v_op IN ('I','D') THEN
        SIGNAL SQLSTATE '75040'
            SET MESSAGE_TEXT = 'INSERT/DELETE en componentes_sistema requiere migración.';
    END IF;

    IF COALESCE(N.codigo,'~')    <> COALESCE(O.codigo,'~')    OR
       COALESCE(N.nombre,'~')    <> COALESCE(O.nombre,'~')    OR
       COALESCE(N.categoria,'~') <> COALESCE(O.categoria,'~') OR
       COALESCE(N.version,'~')   <> COALESCE(O.version,'~')
    THEN
        SIGNAL SQLSTATE '75041'
            SET MESSAGE_TEXT = 'componentes_sistema: solo activo es mutable.';
    END IF;
END@@@


-- ============================================================
-- 3. BITÁCORAS DE AUDITORÍA — insert-only
-- ============================================================

CREATE OR REPLACE TRIGGER trg_variables_historia_audit
NO CASCADE BEFORE UPDATE OR DELETE ON variables_historia
REFERENCING NEW AS N OLD AS O
FOR EACH ROW
BEGIN ATOMIC
    IF app_allow_metadata_change = 'true' THEN
        RETURN;
    END IF;
    SIGNAL SQLSTATE '75100'
        SET MESSAGE_TEXT = 'variables_historia es bitácora: no permite UPDATE ni DELETE.';
END@@@
