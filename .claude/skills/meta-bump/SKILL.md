---
name: meta-bump-version-semver
description: >
  Activar para subir la versión de la convención de metadata siguiendo SemVer
  simplificado: PATCH (1.0.x) para correcciones cosméticas, MINOR (1.x) para
  tablas/columnas nuevas no breaking, MAJOR (x.0) para cambios incompatibles.
  Genera la migración con INSERT en metadata_versiones y UPDATE de
  tablas_sistema.version_metadata. Determina el tipo de bump preguntando.
  Comandos de activación: /meta-bump
---

# SKILL — Subir versión de la metadata (Fase 1)

**Fase del método:** 1 (versionado)
**Modo asociado:** `/meta`
**Activación:** `/meta-bump`

## Pre-condiciones

- Migración de cambios estructurales ya redactada o aplicada
- Versión vigente conocida: `SELECT version FROM metadata_versiones ORDER BY fecha DESC LIMIT 1`

## Diagnóstico obligatorio

Preguntar:

- [ ] **Tipo de cambio**:
  - PATCH — corrige seeds existentes sin alterar schema
  - MINOR — agrega tabla nueva, columna nueva, o capacidad no breaking
  - MAJOR — renombra/elimina tabla, cambia tipo de dato, breaking change
- [ ] **Resumen del alcance** (1-3 oraciones para `metadata_versiones.descripcion`)
- [ ] **¿Cambia el conjunto de niveles?** Si introduce nivel nuevo (3-9), es
  MINOR mínimo
- [ ] **¿Hay clientes afectados?** Si MAJOR, lista de servicios/UIs a migrar

## Pasos

1. **Consultar versión vigente**:
   ```sql
   SELECT version, niveles, tablas_incluidas FROM metadata_versiones
    ORDER BY fecha DESC, version DESC LIMIT 1;
   ```

2. **Calcular nueva versión** según tipo:
   - PATCH: `1.1` → `1.1.1`
   - MINOR: `1.1` → `1.2`
   - MAJOR: `1.1` → `2.0`

3. **Generar migración** `Dev/migrations/0XX_bump_metadata_<X>.sql`:

   ```sql
   BEGIN;
   SET LOCAL app.allow_metadata_change = 'true';

   INSERT INTO metadata_versiones
     (version, fecha, niveles, tablas_incluidas, descripcion,
      mensaje_ayuda, nota_admin, nota_programador, nota_operador)
   VALUES (
     '<nueva_version>', CURRENT_DATE,
     '<niveles_csv>', <count_tablas>,
     '<resumen del alcance>',
     '<ayuda al usuario>',
     '<implicaciones para administradores>',
     '<detalles técnicos para developers>',
     '<para el operador, si aplica>'
   );

   -- Vincular tablas modificadas a la nueva versión
   UPDATE tablas_sistema
      SET version_metadata = '<nueva_version>'
    WHERE nombre_tabla IN (...);

   COMMIT;
   ```

4. **Aplicar migración** a Dev y Prod local.

5. **Documentar el bump** en `docs/16-roadmap-evolucion.md` con fila nueva
   en la tabla de releases.

## Output esperado

- Archivo `Dev/migrations/0XX_bump_metadata_<X>.sql`
- Una fila nueva en `metadata_versiones`
- N tablas con `version_metadata` actualizada
- Entrada en doc 16 roadmap

## Verificación

```sql
SELECT version, niveles, tablas_incluidas
  FROM metadata_versiones
 ORDER BY fecha DESC, version DESC LIMIT 3;

SELECT version_metadata, count(*) FROM tablas_sistema
 WHERE nivel_metadata IS NOT NULL
 GROUP BY version_metadata;
```

## Reglas

- ✓ MAJOR solo con aprobación explícita del sponsor (sección 9)
- ✓ MINOR/PATCH no requieren aprobación, pero se registran
- ✗ Saltar versiones (de 1.1 a 1.5 sin pasar por 1.2-1.4)
- ✗ Reusar versión existente (`metadata_versiones.version` es PK)
