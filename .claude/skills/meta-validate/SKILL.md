---
name: meta-validate-cobertura-bd
description: >
  Activar para verificar la integridad y cobertura completa de la metadata
  del sistema. Corre los 17 checks BD: columnas sin metadata, campos visibles
  sin ayuda, campos PII sin clasificar, variables sin permisos, regex con
  doble escape, etc. Reporta gaps con archivo:línea para cada hallazgo.
  Bloquea avance a Fase 5 si hay cualquier gap.
  Comandos de activación: /meta-validate
---

# SKILL — Validación de cobertura de metadata (Fase 1)

**Fase del método:** 1 (verificación pre-Fase 5)
**Modo asociado:** `/meta`
**Activación:** `/meta-validate`

## Pre-condiciones

- BD destino con migraciones 005-011 aplicadas como mínimo
- Acceso de lectura a `information_schema.columns` y a las tablas de metadata

## Pasos

1. **Ejecutar los 17 checks de integridad** en BD. Cada check debe dar 0:

```sql
SELECT 'columnas_sin_metadata' AS check_name, count(*) AS gap FROM (
  SELECT table_name, column_name FROM information_schema.columns
   WHERE table_schema='public' AND table_name IN (SELECT nombre_tabla FROM tablas_sistema)
  EXCEPT SELECT nombre_tabla, nombre_campo FROM campos_sistema
) x
UNION ALL SELECT 'visibles_sin_ayuda', count(*) FROM campos_sistema
 WHERE (visible_en_lista=1 OR visible_en_form=1)
   AND (mensaje_ayuda IS NULL OR length(trim(mensaje_ayuda))=0)
UNION ALL SELECT 'pii_sin_categoria', count(*) FROM campos_sistema
 WHERE sensible_lfpdppp=1 AND categoria_dato_personal IS NULL
UNION ALL SELECT 'no_pii_con_categoria', count(*) FROM campos_sistema
 WHERE sensible_lfpdppp=0 AND categoria_dato_personal IS NOT NULL
UNION ALL SELECT 'variables_sin_roles', count(*) FROM variables_sistema
 WHERE roles_modificacion IS NULL OR length(trim(roles_modificacion))=0
UNION ALL SELECT 'regex_doble_escape', count(*) FROM campos_sistema
 WHERE regex_validacion LIKE '%\\\\%'
UNION ALL SELECT 'visibles_sin_formato', count(*) FROM campos_sistema
 WHERE (visible_en_lista=1 OR visible_en_form=1)
   AND (formato_despliegue IS NULL OR length(trim(formato_despliegue))=0)
UNION ALL SELECT 'campos_sin_nombre_corto', count(*) FROM campos_sistema
 WHERE nombre_corto IS NULL OR length(trim(nombre_corto))=0
UNION ALL SELECT 'campos_sin_nombre_largo', count(*) FROM campos_sistema
 WHERE nombre_largo IS NULL OR length(trim(nombre_largo))=0
UNION ALL SELECT 'tablas_sin_funcion', count(*) FROM tablas_sistema WHERE funcion IS NULL
UNION ALL SELECT 'tablas_sin_descripcion', count(*) FROM tablas_sistema
 WHERE descripcion IS NULL OR length(trim(descripcion))=0
UNION ALL SELECT 'tablas_metadata_sin_nivel', count(*) FROM tablas_sistema
 WHERE funcion='METADATA' AND nivel_metadata IS NULL
UNION ALL SELECT 'tablas_metadata_sin_version', count(*) FROM tablas_sistema
 WHERE nivel_metadata IS NOT NULL AND version_metadata IS NULL
UNION ALL SELECT 'procesos_sin_notas', count(*) FROM procesos_sistema
 WHERE mensaje_ayuda IS NULL OR nota_admin IS NULL
    OR nota_programador IS NULL OR nota_operador IS NULL
UNION ALL SELECT 'semaforos_sin_notas', count(*) FROM semaforos_sistema
 WHERE mensaje_ayuda IS NULL OR nota_admin IS NULL
    OR nota_programador IS NULL OR nota_operador IS NULL
UNION ALL SELECT 'componentes_sin_proposito', count(*) FROM componentes_sistema
 WHERE proposito IS NULL OR length(trim(proposito))=0
UNION ALL SELECT 'componentes_sin_notas', count(*) FROM componentes_sistema
 WHERE mensaje_ayuda IS NULL OR nota_admin IS NULL
    OR nota_programador IS NULL OR nota_operador IS NULL
ORDER BY check_name;
```

2. **Si hay gaps, listar en detalle** las filas afectadas:
   ```sql
   SELECT nombre_tabla, nombre_campo
     FROM campos_sistema
    WHERE (visible_en_lista=1 OR visible_en_form=1) AND mensaje_ayuda IS NULL;
   ```

3. **Reportar** con formato:
   - ✅ Si los 17 dan 0: "COBERTURA 100% — listo para Fase 5"
   - ❌ Si hay gaps: lista priorizada por severidad

## Output esperado

Reporte de uno de dos tipos:

### Cobertura 100%
```
✅ Verificación de metadata: COBERTURA COMPLETA
17/17 checks en 0
Versión vigente: <version>
Tablas registradas: <count>
Filas en campos_sistema: <count>

Sistema listo para Fase 5 (programación).
```

### Con gaps
```
❌ Verificación de metadata: <N> GAPS DETECTADOS

ALTA — bloqueadores para Fase 5:
- columnas_sin_metadata: <count> (lista las primeras 5)
- visibles_sin_ayuda: <count>
- variables_sin_roles: <count>

MEDIA:
- pii_sin_categoria: <count>
- regex_doble_escape: <count>

Acción requerida: /meta para corregir cada gap antes de avanzar.
```

## Verificación

El comando es self-validating: el output ES la verificación.

## Reglas

- ✗ NO permitir avanzar a Fase 5 con cualquier gap > 0
- ✗ NO modificar metadata para "limpiar" un gap sin migración
- ✓ Si hay gap, derivar a `/meta-add-tabla` o migración correctiva
