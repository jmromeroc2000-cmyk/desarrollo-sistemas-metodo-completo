-- ============================================================
-- Oracle Database — Triggers de protección de metadata (Capa 2)
-- ============================================================
--
-- Aplica AUTOMÁTICAMENTE por el migration runner cuando detecta
-- DB_DRIVER=oracle. Implementa defensa-en-profundidad sobre la
-- Capa 1 (middleware protectMetadata).
--
-- Bypass: Oracle usa Application Contexts. El runner crea/usa el contexto
-- APP_CTX y setea allow_metadata_change vía un package. ANTES de cada
-- migración:
--     BEGIN APP_CTX_PKG.set_allow_metadata_change('true'); END;
-- El context es session-scoped (se limpia al cerrar la sesión).
--
-- Sintaxis Oracle:
--   • Cada CREATE TRIGGER termina con / (slash) en su propia línea
--   • PL/SQL usa RAISE_APPLICATION_ERROR(num, msg) con num en -20000..-20999
--   • CREATE OR REPLACE permite re-ejecución idempotente
--   • Cada statement en este archivo se separa con / (slash) y el runner
--     lo detecta para enviar a Oracle uno por uno
-- ============================================================

-- ============================================================
-- 0. APPLICATION CONTEXT + PACKAGE PARA SETEAR EL BYPASS
-- ============================================================

CREATE OR REPLACE PACKAGE APP_CTX_PKG AS
    PROCEDURE set_allow_metadata_change(p_value IN VARCHAR2);
END APP_CTX_PKG;
/

CREATE OR REPLACE PACKAGE BODY APP_CTX_PKG AS
    PROCEDURE set_allow_metadata_change(p_value IN VARCHAR2) IS
    BEGIN
        DBMS_SESSION.SET_CONTEXT('APP_CTX', 'allow_metadata_change', p_value);
    END;
END APP_CTX_PKG;
/

-- Crear el contexto usando el package como TRUSTED para que el package
-- sea el ÚNICO que pueda escribir al context (defensa-en-profundidad).
CREATE OR REPLACE CONTEXT APP_CTX USING APP_CTX_PKG;
/

-- ============================================================
-- 1. TABLAS TOTALMENTE INMUTABLES
-- ============================================================

CREATE OR REPLACE TRIGGER trg_tablas_sistema_inmutable
BEFORE INSERT OR UPDATE OR DELETE ON tablas_sistema
FOR EACH ROW
BEGIN
    IF SYS_CONTEXT('APP_CTX', 'allow_metadata_change') = 'true' THEN
        RETURN;
    END IF;
    RAISE_APPLICATION_ERROR(-20001,
        'tablas_sistema es metadata inmutable. Cambios solo en migraciones.');
END;
/

CREATE OR REPLACE TRIGGER trg_campos_sistema_inmutable
BEFORE INSERT OR UPDATE OR DELETE ON campos_sistema
FOR EACH ROW
BEGIN
    IF SYS_CONTEXT('APP_CTX', 'allow_metadata_change') = 'true' THEN
        RETURN;
    END IF;
    RAISE_APPLICATION_ERROR(-20002,
        'campos_sistema es metadata inmutable. Cambios solo en migraciones.');
END;
/

CREATE OR REPLACE TRIGGER trg_metadata_versiones_inmutable
BEFORE INSERT OR UPDATE OR DELETE ON metadata_versiones
FOR EACH ROW
BEGIN
    IF SYS_CONTEXT('APP_CTX', 'allow_metadata_change') = 'true' THEN
        RETURN;
    END IF;
    RAISE_APPLICATION_ERROR(-20003,
        'metadata_versiones es inmutable. Solo INSERT desde migraciones.');
END;
/

CREATE OR REPLACE TRIGGER trg_semaforos_gating_inmutable
BEFORE INSERT OR UPDATE OR DELETE ON semaforos_gating
FOR EACH ROW
BEGIN
    IF SYS_CONTEXT('APP_CTX', 'allow_metadata_change') = 'true' THEN
        RETURN;
    END IF;
    RAISE_APPLICATION_ERROR(-20004,
        'semaforos_gating es metadata inmutable. Cambios solo en migraciones.');
END;
/

-- ============================================================
-- 2. TABLAS CON COLUMNAS MUTABLES PARCIALES
-- ============================================================

-- procesos_sistema: mutables = activo, ultima_ejecucion, proxima_ejecucion, ultima_duracion_ms
CREATE OR REPLACE TRIGGER trg_procesos_sistema_protect
BEFORE INSERT OR UPDATE OR DELETE ON procesos_sistema
FOR EACH ROW
BEGIN
    IF SYS_CONTEXT('APP_CTX', 'allow_metadata_change') = 'true' THEN
        RETURN;
    END IF;
    IF INSERTING OR DELETING THEN
        RAISE_APPLICATION_ERROR(-20010,
            'INSERT/DELETE en procesos_sistema requiere migración.');
    END IF;
    -- UPDATE: validar que NO cambiaron columnas inmutables
    IF NVL(:NEW.codigo,'~') <> NVL(:OLD.codigo,'~')                       OR
       NVL(:NEW.descripcion,'~') <> NVL(:OLD.descripcion,'~')             OR
       NVL(:NEW.frecuencia,'~') <> NVL(:OLD.frecuencia,'~')               OR
       NVL(:NEW.mensaje_ayuda,'~') <> NVL(:OLD.mensaje_ayuda,'~')         OR
       NVL(:NEW.nota_admin,'~') <> NVL(:OLD.nota_admin,'~')               OR
       NVL(:NEW.nota_programador,'~') <> NVL(:OLD.nota_programador,'~')   OR
       NVL(:NEW.nota_operador,'~') <> NVL(:OLD.nota_operador,'~')
    THEN
        RAISE_APPLICATION_ERROR(-20011,
            'procesos_sistema: solo activo/ultima_ejecucion/proxima_ejecucion/ultima_duracion_ms son mutables.');
    END IF;
END;
/

-- semaforos_sistema: mutables = estado_actual, valor_actual, actualizado_en
CREATE OR REPLACE TRIGGER trg_semaforos_sistema_protect
BEFORE INSERT OR UPDATE OR DELETE ON semaforos_sistema
FOR EACH ROW
BEGIN
    IF SYS_CONTEXT('APP_CTX', 'allow_metadata_change') = 'true' THEN
        RETURN;
    END IF;
    IF INSERTING OR DELETING THEN
        RAISE_APPLICATION_ERROR(-20020,
            'INSERT/DELETE en semaforos_sistema requiere migración.');
    END IF;
    IF NVL(:NEW.codigo,'~') <> NVL(:OLD.codigo,'~')                           OR
       NVL(:NEW.descripcion,'~') <> NVL(:OLD.descripcion,'~')                 OR
       NVL(:NEW.sentido,'~') <> NVL(:OLD.sentido,'~')                         OR
       NVL(:NEW.fuente_datos,'~') <> NVL(:OLD.fuente_datos,'~')               OR
       NVL(:NEW.umbral_verde_max,-999) <> NVL(:OLD.umbral_verde_max,-999)     OR
       NVL(:NEW.umbral_amarillo_max,-999) <> NVL(:OLD.umbral_amarillo_max,-999)
    THEN
        RAISE_APPLICATION_ERROR(-20021,
            'semaforos_sistema: solo estado_actual/valor_actual/actualizado_en son mutables.');
    END IF;
END;
/

-- variables_sistema: mutables = valor, modificado_en, modificado_por
CREATE OR REPLACE TRIGGER trg_variables_sistema_protect
BEFORE INSERT OR UPDATE OR DELETE ON variables_sistema
FOR EACH ROW
BEGIN
    IF SYS_CONTEXT('APP_CTX', 'allow_metadata_change') = 'true' THEN
        RETURN;
    END IF;
    IF INSERTING OR DELETING THEN
        RAISE_APPLICATION_ERROR(-20030,
            'INSERT/DELETE en variables_sistema requiere migración.');
    END IF;
    IF NVL(:NEW.clave,'~') <> NVL(:OLD.clave,'~')                                 OR
       NVL(:NEW.valor_defecto,'~') <> NVL(:OLD.valor_defecto,'~')                 OR
       NVL(:NEW.tipo_dato,'~') <> NVL(:OLD.tipo_dato,'~')                         OR
       NVL(:NEW.roles_modificacion,'~') <> NVL(:OLD.roles_modificacion,'~')       OR
       NVL(:NEW.roles_lectura,'~') <> NVL(:OLD.roles_lectura,'~')                 OR
       NVL(:NEW.valores_posibles,'~') <> NVL(:OLD.valores_posibles,'~')
    THEN
        RAISE_APPLICATION_ERROR(-20031,
            'variables_sistema: solo valor/modificado_en/modificado_por son mutables.');
    END IF;
END;
/

-- componentes_sistema: mutables = activo
CREATE OR REPLACE TRIGGER trg_componentes_sistema_protect
BEFORE INSERT OR UPDATE OR DELETE ON componentes_sistema
FOR EACH ROW
BEGIN
    IF SYS_CONTEXT('APP_CTX', 'allow_metadata_change') = 'true' THEN
        RETURN;
    END IF;
    IF INSERTING OR DELETING THEN
        RAISE_APPLICATION_ERROR(-20040,
            'INSERT/DELETE en componentes_sistema requiere migración.');
    END IF;
    IF NVL(:NEW.codigo,'~') <> NVL(:OLD.codigo,'~')         OR
       NVL(:NEW.nombre,'~') <> NVL(:OLD.nombre,'~')         OR
       NVL(:NEW.categoria,'~') <> NVL(:OLD.categoria,'~')   OR
       NVL(:NEW.version,'~') <> NVL(:OLD.version,'~')
    THEN
        RAISE_APPLICATION_ERROR(-20041,
            'componentes_sistema: solo activo es mutable.');
    END IF;
END;
/

-- ============================================================
-- 3. BITÁCORAS DE AUDITORÍA — insert-only
-- ============================================================

CREATE OR REPLACE TRIGGER trg_variables_historia_audit
BEFORE UPDATE OR DELETE ON variables_historia
FOR EACH ROW
BEGIN
    IF SYS_CONTEXT('APP_CTX', 'allow_metadata_change') = 'true' THEN
        RETURN;
    END IF;
    RAISE_APPLICATION_ERROR(-20100,
        'variables_historia es bitácora: no permite UPDATE ni DELETE.');
END;
/
