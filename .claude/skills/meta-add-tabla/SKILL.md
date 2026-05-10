---
name: meta-add-tabla-wizard-migracion
description: >
  Activar cuando el usuario quiera agregar una tabla nueva al sistema. Wizard
  que pregunta nombre, función operativa, nivel de metadata, lista de campos
  con tipos. Genera la migración SQL completa con BEGIN/SET LOCAL/COMMIT,
  inserts en tablas_sistema y campos_sistema, validaciones declaradas, notas
  para los 4 perfiles (admin/programador/operador/usuario) y CHECK constraints.
  Comandos de activación: /meta-add-tabla
---

# SKILL — Agregar tabla nueva con metadata completa (Fase 1)

**Fase del método:** 1 (metadata)
**Modo asociado:** `/meta`
**Activación:** `/meta-add-tabla`

## Pre-condiciones

- Las 11 migraciones bootstrap aplicadas
- Backend conectado a la BD destino
- Conocer la versión vigente: `SELECT version FROM metadata_versiones ORDER BY fecha DESC LIMIT 1`

## Diagnóstico obligatorio (wizard)

Para cada tabla nueva, preguntar:

- [ ] **Nombre técnico** (ej. `pedidos`, `alumnos`, `materias`) — snake_case
- [ ] **Función operativa** — uno de:
  - `CATALOGO` — datos maestros estables (productos, clientes)
  - `REFERENCIA` — listas finitas (unidades_medida, tipos_X)
  - `TRANSACCIONAL` — operaciones del día (entradas, salidas, pedidos)
  - `DETALLE` — líneas hijas de transaccionales (entradas_detalle)
  - `ESTADO` — vista materializada o resumen (inventario)
  - `AUDITORIA` — bitácora inmutable (logs, historia)
  - `RELACION` — N-a-N entre tablas (usuarios_roles)
  - `IDENTIDAD` — usuarios, roles, sesiones
  - `METADATA` — tabla del propio sistema de metadata
- [ ] **Nivel de metadata** — solo si la tabla ES metadata (1-9 según §15)
- [ ] **¿Tiene UI auto-generable?** — bool `generar_ui_crud`
- [ ] **Lista de campos** con: nombre, tipo SQL, formato_despliegue,
  obligatorio, visible_en_lista, visible_en_form, sensible_lfpdppp,
  validación (NINGUNA/REGEX/LISTA/RANGO/CATALOGO)
- [ ] **Las 4 notas** de la tabla:
  - mensaje_ayuda (lenguaje del usuario)
  - nota_admin (constraints, retention, decisiones de negocio)
  - nota_programador (índices, hooks, integraciones)
  - nota_operador (qué SÍ y NO debe hacer)

## Pasos

1. **Detectar el siguiente número de migración**:
   ```bash
   ls Dev/migrations/[0-9]*.sql | tail -1
   # → ej. 011 → siguiente es 012
   ```

2. **Generar archivo `Dev/migrations/0XX_<nombre>.sql`** con esta estructura:
   ```sql
   -- ========================================================
   -- Migración 0XX: Tabla <nombre>
   -- Fase 1 — Metadata
   -- Fecha: YYYY-MM-DD
   -- ========================================================

   BEGIN;
   SET LOCAL app.allow_metadata_change = 'true';

   -- 1. CREATE TABLE (SQL-92 estricto)
   CREATE TABLE <nombre> (
     id          CHAR(36)     NOT NULL,
     -- ... campos del dominio ...
     creado_en   TIMESTAMP    NOT NULL,
     activo      SMALLINT     NOT NULL DEFAULT 1
                 CONSTRAINT ck_<nombre>_activo CHECK (activo IN (0, 1)),
     CONSTRAINT pk_<nombre> PRIMARY KEY (id)
   );

   -- 2. Registro en tablas_sistema con las 4 notas
   INSERT INTO tablas_sistema
     (nombre_tabla, funcion, descripcion, generar_ui_crud,
      nivel_metadata, version_metadata,
      mensaje_ayuda, nota_admin, nota_programador, nota_operador)
   VALUES (
     '<nombre>', '<FUNCION>', '<descripcion>', <0|1>,
     <NULL o nivel>, <NULL o '1.x'>,
     '<mensaje_ayuda>',
     '<nota_admin>',
     '<nota_programador>',
     '<nota_operador>');

   -- 3. Registro de cada columna en campos_sistema
   INSERT INTO campos_sistema (...)
   VALUES (...);

   -- 4. Si es minor o major, subir version
   -- INSERT INTO metadata_versiones ...
   -- UPDATE tablas_sistema SET version_metadata='1.x+1' WHERE ...;

   COMMIT;
   ```

3. **Aplicar la migración** a Dev y Prod local.

4. **Correr `/meta-validate`** para confirmar 0 gaps.

## Output esperado

- Archivo `Dev/migrations/0XX_<nombre>.sql` versionado
- Una fila nueva en `tablas_sistema`
- N filas nuevas en `campos_sistema` (una por columna)
- Si la migración subió la versión, una fila nueva en `metadata_versiones`

## Verificación post-aplicación

```sql
-- Confirmar registro
SELECT * FROM tablas_sistema WHERE nombre_tabla = '<nombre>';

-- Confirmar columnas mapeadas (debe coincidir con information_schema)
SELECT count(*) AS metadata, (
  SELECT count(*) FROM information_schema.columns
   WHERE table_name='<nombre>' AND table_schema='public'
) AS reales
FROM campos_sistema WHERE nombre_tabla='<nombre>';
-- Esperado: metadata = reales

-- Sin campos visibles sin ayuda
SELECT count(*) FROM campos_sistema
 WHERE nombre_tabla='<nombre>'
   AND (visible_en_lista=1 OR visible_en_form=1)
   AND mensaje_ayuda IS NULL;
-- Esperado: 0
```

## Reglas obligatorias

- ✓ TODA columna real tiene fila en `campos_sistema`
- ✓ Campos visibles SIEMPRE tienen `mensaje_ayuda` (CHECK lo enforce)
- ✓ Campos PII tienen `sensible_lfpdppp=1` + `categoria_dato_personal`
- ✗ Olvidar `BEGIN; SET LOCAL app.allow_metadata_change='true';`
- ✗ Crear tabla sin sus inserts en metadata
- ✗ Saltarse el `/meta-validate` después
