---
name: meta-derive-desde-information-schema
description: >
  Activar cuando un sistema legacy tiene tablas en BD pero no su entrada en
  metadata. Lee information_schema y genera una migración correctiva con los
  inserts faltantes en tablas_sistema y campos_sistema. Útil para integrar el
  método en proyectos preexistentes o tras un import masivo de schema.
  Comandos de activación: /meta-derive
---

# SKILL — Derivar metadata desde schema real (Fase 1 correctiva)

**Fase del método:** 1 (correctiva)
**Modo asociado:** `/meta`
**Activación:** `/meta-derive`

## Pre-condiciones

- Migraciones 005-011 aplicadas (la infraestructura de metadata existe)
- BD con tablas que aún no están en `tablas_sistema`/`campos_sistema`

## Diagnóstico obligatorio

Preguntar:

- [ ] **Alcance** — ¿todas las tablas faltantes o solo un schema/módulo?
- [ ] **Función por defecto** — si la tabla no es obvia, ¿CATALOGO? ¿TRANSACCIONAL?
  El skill propone, el humano confirma una a una.
- [ ] **¿Qué hacer con campos sin metadata clara?** Marcar como
  `mensaje_ayuda='[VERIFICAR — generado automáticamente]'` para revisión humana.

## Pasos

1. **Detectar tablas reales sin entrada en `tablas_sistema`**:
   ```sql
   SELECT table_name FROM information_schema.tables
    WHERE table_schema='public'
      AND table_type='BASE TABLE'
      AND table_name NOT IN (SELECT nombre_tabla FROM tablas_sistema);
   ```

2. **Detectar columnas sin entrada en `campos_sistema`**:
   ```sql
   SELECT table_name, column_name, data_type, is_nullable, character_maximum_length
     FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name IN (SELECT nombre_tabla FROM tablas_sistema)
   EXCEPT
   SELECT nombre_tabla, nombre_campo, NULL, NULL, NULL FROM campos_sistema;
   ```

3. **Para cada tabla faltante, proponer al usuario**:
   - Función operativa (basada en heurísticas: nombres con "_detalle" → DETALLE,
     "_historia" → AUDITORIA, etc.)
   - Las 4 notas con plantillas mínimas
   - `generar_ui_crud` por defecto = 1 si CATALOGO, 0 en otros

4. **Para cada columna faltante, mapear automáticamente**:

   | data_type SQL | formato_despliegue propuesto |
   |---------------|------------------------------|
   | char, varchar, text | TEXTO (o EMAIL/RFC/TELEFONO si nombre lo sugiere) |
   | integer, smallint | NUMERO_ENTERO |
   | numeric, decimal | NUMERO_DECIMAL (MONEDA_MXN si nombre tiene `precio`/`costo`/`monto`) |
   | date | FECHA |
   | timestamp | FECHA_HORA |
   | uuid (CHAR(36)) | UUID o RELACION (si termina en `_id`) |
   | smallint con CHECK (0,1) | BOOLEANO_SI_NO o BOOLEANO_ACTIVO |

5. **Generar migración** `Dev/migrations/0XX_meta_derive_<modulo>.sql`:
   ```sql
   BEGIN;
   SET LOCAL app.allow_metadata_change = 'true';

   -- Tablas faltantes
   INSERT INTO tablas_sistema (...) VALUES (...);

   -- Columnas faltantes (con flags conservadores: visible_en_lista=0,
   -- visible_en_form=0, sensible_lfpdppp=0)
   INSERT INTO campos_sistema (...) VALUES (...);

   COMMIT;
   ```

6. **Marcar el resultado como pendiente de revisión humana** con prefijo
   `[VERIFICAR]` en `mensaje_ayuda` para que aparezca en `/meta-validate`
   como gap a cerrar.

## Output esperado

- Migración correctiva con N inserts mapeados desde el schema real
- Reporte de qué se mapeó automáticamente vs qué requiere revisión humana

## Verificación

```sql
-- 0 columnas reales sin metadata después del skill
SELECT count(*) FROM (
  SELECT table_name, column_name FROM information_schema.columns
   WHERE table_schema='public'
     AND table_name IN (SELECT nombre_tabla FROM tablas_sistema)
  EXCEPT SELECT nombre_tabla, nombre_campo FROM campos_sistema
) x;
-- Esperado: 0

-- Filas pendientes de revisión humana (con prefijo [VERIFICAR])
SELECT count(*) FROM campos_sistema WHERE mensaje_ayuda LIKE '[VERIFICAR]%';
```

## Reglas

- ✓ Siempre marcar mapeos automáticos como `[VERIFICAR]` para revisión
- ✗ NO marcar como sensible_lfpdppp por adivinación — solo si el nombre
  es inequívocamente PII (email, password_hash, rfc)
- ✗ NO inferir tipo_validacion (REGEX/LISTA/RANGO) sin input humano
