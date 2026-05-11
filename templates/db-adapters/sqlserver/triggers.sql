-- ============================================================
-- SQL Server — Triggers de protección de metadata (Capa 2)
-- ============================================================
--
-- Aplica AUTOMÁTICAMENTE por el migration runner cuando detecta
-- DB_DRIVER=sqlserver. Implementa defensa-en-profundidad sobre la
-- Capa 1 (middleware protectMetadata).
--
-- Bypass: el migration runner ejecuta
--     EXEC sys.sp_set_session_context @key=N'allow_metadata_change',
--                                     @value=N'true', @read_only=0;
-- ANTES de cada migración. SESSION_CONTEXT es session-scoped (se limpia
-- automáticamente al cerrar la sesión).
--
-- Sintaxis T-SQL:
--   • Un solo trigger AFTER puede manejar INSERT/UPDATE/DELETE (a diferencia
--     de MySQL que requiere triggers separados por evento).
--   • SET NOCOUNT ON al inicio (best practice T-SQL en triggers).
--   • THROW (SQL Server 2012+) para error claro al cliente.
--   • Cada batch separado por "GO".
--
-- ============================================================

-- ============================================================
-- 1. TABLAS TOTALMENTE INMUTABLES
-- ============================================================

IF OBJECT_ID('dbo.trg_tablas_sistema_inmutable', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_tablas_sistema_inmutable;
GO
CREATE TRIGGER dbo.trg_tablas_sistema_inmutable
ON dbo.tablas_sistema
INSTEAD OF INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF SESSION_CONTEXT(N'allow_metadata_change') = N'true'
    BEGIN
        -- Bypass activo: reaplicar la operación dentro de un sub-context
        -- En SQL Server INSTEAD OF triggers tenemos que re-emitir el DML
        -- explícitamente. Para esto el migration runner usa procedimientos
        -- almacenados con bypass o aplica el SQL en sesión que tiene el flag.
        IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
            INSERT INTO dbo.tablas_sistema SELECT * FROM inserted;
        ELSE IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
            DELETE FROM dbo.tablas_sistema WHERE nombre_tabla IN (SELECT nombre_tabla FROM deleted);
        ELSE
        BEGIN
            -- UPDATE: aplicar via key match (asume PK = nombre_tabla)
            UPDATE t SET
                funcion = i.funcion,
                descripcion = i.descripcion,
                nivel_metadata = i.nivel_metadata,
                version_metadata = i.version_metadata,
                tabla_uso = i.tabla_uso,
                generar_ui_crud = i.generar_ui_crud,
                mensaje_ayuda = i.mensaje_ayuda,
                nota_admin = i.nota_admin
            FROM dbo.tablas_sistema t
            INNER JOIN inserted i ON t.nombre_tabla = i.nombre_tabla;
        END
        RETURN;
    END
    THROW 51000, 'tablas_sistema es metadata inmutable. Cambios solo en migraciones.', 1;
END
GO

-- campos_sistema:
IF OBJECT_ID('dbo.trg_campos_sistema_inmutable', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_campos_sistema_inmutable;
GO
CREATE TRIGGER dbo.trg_campos_sistema_inmutable
ON dbo.campos_sistema
INSTEAD OF INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF SESSION_CONTEXT(N'allow_metadata_change') = N'true'
    BEGIN
        IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
            INSERT INTO dbo.campos_sistema SELECT * FROM inserted;
        ELSE IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
            DELETE FROM dbo.campos_sistema
            WHERE EXISTS (SELECT 1 FROM deleted d
                          WHERE d.nombre_tabla = campos_sistema.nombre_tabla
                            AND d.nombre_campo = campos_sistema.nombre_campo);
        ELSE
        BEGIN
            UPDATE c SET
                nombre_corto = i.nombre_corto,
                nombre_largo = i.nombre_largo,
                formato_despliegue = i.formato_despliegue,
                tipo_validacion = i.tipo_validacion,
                valores_posibles = i.valores_posibles,
                mensaje_ayuda = i.mensaje_ayuda,
                obligatorio = i.obligatorio,
                visible_en_lista = i.visible_en_lista,
                visible_en_form = i.visible_en_form,
                editable = i.editable,
                sensible_lfpdppp = i.sensible_lfpdppp,
                categoria_dato_personal = i.categoria_dato_personal,
                orden_despliegue = i.orden_despliegue
            FROM dbo.campos_sistema c
            INNER JOIN inserted i
              ON c.nombre_tabla = i.nombre_tabla
             AND c.nombre_campo = i.nombre_campo;
        END
        RETURN;
    END
    THROW 51000, 'campos_sistema es metadata inmutable. Cambios solo en migraciones.', 1;
END
GO

-- metadata_versiones (patrón análogo, condensado):
IF OBJECT_ID('dbo.trg_metadata_versiones_inmutable', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_metadata_versiones_inmutable;
GO
CREATE TRIGGER dbo.trg_metadata_versiones_inmutable
ON dbo.metadata_versiones
INSTEAD OF INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF SESSION_CONTEXT(N'allow_metadata_change') = N'true'
    BEGIN
        IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
            INSERT INTO dbo.metadata_versiones SELECT * FROM inserted;
        ELSE
            THROW 51000, 'metadata_versiones solo permite INSERT (insert-only).', 1;
        RETURN;
    END
    THROW 51000, 'metadata_versiones es metadata inmutable. Solo INSERT desde migraciones.', 1;
END
GO

-- semaforos_gating:
IF OBJECT_ID('dbo.trg_semaforos_gating_inmutable', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_semaforos_gating_inmutable;
GO
CREATE TRIGGER dbo.trg_semaforos_gating_inmutable
ON dbo.semaforos_gating
INSTEAD OF INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF SESSION_CONTEXT(N'allow_metadata_change') = N'true'
    BEGIN
        IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
            INSERT INTO dbo.semaforos_gating SELECT * FROM inserted;
        ELSE IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
            DELETE FROM dbo.semaforos_gating
            WHERE EXISTS (SELECT 1 FROM deleted d
                          WHERE d.codigo = semaforos_gating.codigo);
        ELSE
            UPDATE g SET
                operacion = i.operacion,
                roles = i.roles,
                semaforo_codigo = i.semaforo_codigo,
                accion = i.accion,
                mensaje = i.mensaje
            FROM dbo.semaforos_gating g
            INNER JOIN inserted i ON g.codigo = i.codigo;
        RETURN;
    END
    THROW 51000, 'semaforos_gating es metadata inmutable. Cambios solo en migraciones.', 1;
END
GO


-- ============================================================
-- 2. TABLAS CON COLUMNAS MUTABLES PARCIALES — usar AFTER triggers
--    para validar y rollback si tocaron columna inmutable.
-- ============================================================

-- procesos_sistema: mutables = activo, ultima_ejecucion, proxima_ejecucion, ultima_duracion_ms
IF OBJECT_ID('dbo.trg_procesos_sistema_protect', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_procesos_sistema_protect;
GO
CREATE TRIGGER dbo.trg_procesos_sistema_protect
ON dbo.procesos_sistema
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF SESSION_CONTEXT(N'allow_metadata_change') = N'true' RETURN;

    -- INSERT y DELETE requieren bypass
    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51000, 'INSERT en procesos_sistema requiere migración.', 1;
    END
    IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51000, 'DELETE en procesos_sistema requiere migración.', 1;
    END

    -- UPDATE: validar columnas inmutables
    IF EXISTS (
        SELECT 1
          FROM inserted i
          JOIN deleted d ON i.codigo = d.codigo
         WHERE i.codigo <> d.codigo
            OR ISNULL(i.descripcion,'')      <> ISNULL(d.descripcion,'')
            OR ISNULL(i.frecuencia,'')       <> ISNULL(d.frecuencia,'')
            OR ISNULL(i.mensaje_ayuda,'')    <> ISNULL(d.mensaje_ayuda,'')
            OR ISNULL(i.nota_admin,'')       <> ISNULL(d.nota_admin,'')
            OR ISNULL(i.nota_programador,'') <> ISNULL(d.nota_programador,'')
            OR ISNULL(i.nota_operador,'')    <> ISNULL(d.nota_operador,'')
    )
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51000, 'procesos_sistema: solo activo/ultima_ejecucion/proxima_ejecucion/ultima_duracion_ms son mutables.', 1;
    END
END
GO

-- semaforos_sistema: mutables = estado_actual, valor_actual, actualizado_en
IF OBJECT_ID('dbo.trg_semaforos_sistema_protect', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_semaforos_sistema_protect;
GO
CREATE TRIGGER dbo.trg_semaforos_sistema_protect
ON dbo.semaforos_sistema
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF SESSION_CONTEXT(N'allow_metadata_change') = N'true' RETURN;

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN ROLLBACK TRANSACTION; THROW 51000, 'INSERT semaforos_sistema → migración.', 1; END
    IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN ROLLBACK TRANSACTION; THROW 51000, 'DELETE semaforos_sistema → migración.', 1; END

    IF EXISTS (
        SELECT 1
          FROM inserted i
          JOIN deleted d ON i.codigo = d.codigo
         WHERE ISNULL(i.descripcion,'')         <> ISNULL(d.descripcion,'')
            OR ISNULL(i.sentido,'')             <> ISNULL(d.sentido,'')
            OR ISNULL(i.fuente_datos,'')        <> ISNULL(d.fuente_datos,'')
            OR ISNULL(i.umbral_verde_max,0)     <> ISNULL(d.umbral_verde_max,0)
            OR ISNULL(i.umbral_amarillo_max,0)  <> ISNULL(d.umbral_amarillo_max,0)
    )
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51000, 'semaforos_sistema: solo estado_actual/valor_actual/actualizado_en son mutables.', 1;
    END
END
GO

-- variables_sistema: mutables = valor, modificado_en, modificado_por
IF OBJECT_ID('dbo.trg_variables_sistema_protect', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_variables_sistema_protect;
GO
CREATE TRIGGER dbo.trg_variables_sistema_protect
ON dbo.variables_sistema
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF SESSION_CONTEXT(N'allow_metadata_change') = N'true' RETURN;

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN ROLLBACK TRANSACTION; THROW 51000, 'INSERT variables_sistema → migración.', 1; END
    IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN ROLLBACK TRANSACTION; THROW 51000, 'DELETE variables_sistema → migración.', 1; END

    IF EXISTS (
        SELECT 1
          FROM inserted i
          JOIN deleted d ON i.clave = d.clave
         WHERE ISNULL(i.valor_defecto,'')       <> ISNULL(d.valor_defecto,'')
            OR ISNULL(i.tipo_dato,'')           <> ISNULL(d.tipo_dato,'')
            OR ISNULL(i.roles_modificacion,'')  <> ISNULL(d.roles_modificacion,'')
            OR ISNULL(i.roles_lectura,'')       <> ISNULL(d.roles_lectura,'')
            OR ISNULL(i.valores_posibles,'')    <> ISNULL(d.valores_posibles,'')
    )
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51000, 'variables_sistema: solo valor/modificado_en/modificado_por son mutables.', 1;
    END
END
GO

-- componentes_sistema: mutables = activo
IF OBJECT_ID('dbo.trg_componentes_sistema_protect', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_componentes_sistema_protect;
GO
CREATE TRIGGER dbo.trg_componentes_sistema_protect
ON dbo.componentes_sistema
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF SESSION_CONTEXT(N'allow_metadata_change') = N'true' RETURN;

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN ROLLBACK TRANSACTION; THROW 51000, 'INSERT componentes_sistema → migración.', 1; END
    IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN ROLLBACK TRANSACTION; THROW 51000, 'DELETE componentes_sistema → migración.', 1; END

    IF EXISTS (
        SELECT 1
          FROM inserted i
          JOIN deleted d ON i.codigo = d.codigo
         WHERE ISNULL(i.nombre,'')     <> ISNULL(d.nombre,'')
            OR ISNULL(i.categoria,'')  <> ISNULL(d.categoria,'')
            OR ISNULL(i.version,'')    <> ISNULL(d.version,'')
    )
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51000, 'componentes_sistema: solo activo es mutable.', 1;
    END
END
GO


-- ============================================================
-- 3. BITÁCORAS DE AUDITORÍA — insert-only
-- ============================================================

IF OBJECT_ID('dbo.trg_variables_historia_audit', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_variables_historia_audit;
GO
CREATE TRIGGER dbo.trg_variables_historia_audit
ON dbo.variables_historia
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF SESSION_CONTEXT(N'allow_metadata_change') = N'true' RETURN;
    ROLLBACK TRANSACTION;
    THROW 51000, 'variables_historia es bitácora: no permite UPDATE ni DELETE.', 1;
END
GO
