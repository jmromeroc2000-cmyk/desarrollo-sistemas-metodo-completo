-- ============================================================
-- Migración NNNN — <descripción corta>
-- Aplicar (up). Sintaxis SQL-92 estricta, portable a los 6 DBMS.
-- ============================================================
--
-- REGLAS de SQL portable:
--
-- ✗ NO usar:
--    BEGIN; / COMMIT;              — el runner abre/cierra la transacción
--    SET LOCAL <var>=...           — el runner activa bypass via adapter
--    SERIAL / AUTO_INCREMENT       — usar CHAR(36) UUIDs generados por la app
--    gen_random_uuid()             — usar UUIDs hardcoded en el SQL
--    NOW() / CURRENT_TIMESTAMP()   — usar valor literal '2026-MM-DDTHH:MM:SS.000Z'
--                                    o pasar el valor via params del runner
--    JSONB / JSON                  — usar VARCHAR(N) con validación en app
--    ON CONFLICT / MERGE           — bootstrap NO necesita UPSERT (insert único)
--    plpgsql / PL/SQL / T-SQL      — funciones/procedures: usar app-layer
--    Comments con '--' al final
--    de línea ANSI con columna     — algunos drivers fallan; preferir comentarios
--                                    en línea propia
--
-- ✓ SÍ usar:
--    CREATE TABLE <nombre> (...)   — sintaxis SQL-92 base
--    VARCHAR(N), CHAR(36), INTEGER, SMALLINT, NUMERIC(p,s), TIMESTAMP
--    CHECK / NOT NULL / PRIMARY KEY / FOREIGN KEY / DEFAULT
--    ALTER TABLE ADD COLUMN / DROP COLUMN
--    CREATE INDEX
--    INSERT INTO <tabla> (...) VALUES (...)
--    UPDATE <tabla> SET ... WHERE ...
--    DELETE FROM <tabla> WHERE ...
--
-- DIFERENCIAS sutiles cubiertas por el runner:
--    - El terminator (;) separa statements. El runner sabe que algunos DBMS
--      requieren GO (SQL Server) o / (Oracle) — pero las migraciones SQL-92
--      usan ; uniformemente.
--    - Triggers, functions, procedures NO van en migraciones bootstrap.
--      Se aplican post-bootstrap via `node scripts/migrate.js triggers` que
--      lee templates/db-adapters/<dbms>/triggers.sql del adapter activo.
--
-- BOOTSTRAP IDs:
--    UUIDs deben ser literales hardcoded en el INSERT. Generar previamente
--    con `node -e "console.log(require('crypto').randomUUID())"` o reservar
--    rangos fijos (p.ej. los 5 roles del sistema: 00000001-0000-...-001 a 005).
-- ============================================================

CREATE TABLE mi_tabla (
    id           CHAR(36)      NOT NULL,
    nombre       VARCHAR(200)  NOT NULL,
    activo       SMALLINT      NOT NULL DEFAULT 1,
    creado_en    VARCHAR(40)   NOT NULL,
    CONSTRAINT pk_mi_tabla PRIMARY KEY (id),
    CONSTRAINT ck_mi_tabla_activo CHECK (activo IN (0, 1))
);

-- Si la tabla es metadata, agregar inserción a tablas_sistema + campos_sistema
-- (capa 1 protectMetadata bloquea writes HTTP; el bypass del runner permite
-- estos INSERTs durante esta migración).

INSERT INTO tablas_sistema (
    nombre_tabla, funcion, descripcion, nivel_metadata, version_metadata,
    tabla_uso, generar_ui_crud, mensaje_ayuda, nota_admin
) VALUES (
    'mi_tabla', 'CATALOGO', 'Descripción funcional de la tabla.', 1, '1.0',
    'crud', 1, 'Cómo usarla.', 'Nota administrativa.'
);

INSERT INTO campos_sistema (
    nombre_tabla, nombre_campo, nombre_corto, nombre_largo,
    formato_despliegue, tipo_validacion, mensaje_ayuda,
    obligatorio, visible_en_lista, visible_en_form, editable,
    sensible_lfpdppp, orden_despliegue
) VALUES
    ('mi_tabla', 'id',        'ID',     'Identificador único',     'UUID',    'NINGUNA', 'Generado automáticamente.', 1, 0, 0, 0, 0, 1),
    ('mi_tabla', 'nombre',    'Nombre', 'Nombre',                  'TEXTO',   'NINGUNA', 'Nombre descriptivo.',       1, 1, 1, 1, 0, 2),
    ('mi_tabla', 'activo',    'Activo', 'Activo (0/1)',            'BOOLEANO_ACTIVO', 'NINGUNA', '0=baja, 1=alta.', 1, 1, 1, 1, 0, 3),
    ('mi_tabla', 'creado_en', 'Creado', 'Creado en',               'FECHA_HORA', 'NINGUNA', 'Sello de creación.',  1, 1, 0, 0, 0, 4);

INSERT INTO metadata_versiones (
    version, fecha, niveles, tablas_incluidas, descripcion,
    mensaje_ayuda, nota_admin, nota_programador, nota_operador
) VALUES (
    'x.y.z', '2026-MM-DD', '1', 1,
    'Descripción una línea',
    'Para admin',
    'Para programador',
    'Para operador',
    'Para usuario'
);
