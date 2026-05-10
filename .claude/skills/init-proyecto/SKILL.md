---
name: init-proyecto-bootstrap-metadata
description: >
  Activar cuando el usuario quiera arrancar un proyecto nuevo siguiendo el
  Método Completo de Desarrollo de Sistemas dirigido por Metadata. Copia las
  11 migraciones bootstrap, el árbol .claude/ (skills + agents + settings),
  el CLAUDE.md base preconfigurado, y deja la estructura lista para Fase 1.
  Comandos de activación: /init-proyecto
---

# SKILL — Inicialización de proyecto (Fase 0)

**Fase del método:** 0 (bootstrap pre-Fase 1)
**Modo asociado:** `/sis`
**Activación:** `/init-proyecto`

## Pre-condiciones

- Carpeta destino vacía o solo con `.git/` (si ya inicializaste git)
- Acceso a la fuente del método (este subdirectorio
  `DesarrolloSistemasMetodoCompleto/`)
- Datos del nuevo proyecto: nombre, dominio, BD destino

## Diagnóstico obligatorio

Preguntar si no está en contexto:

- [ ] Nombre del proyecto (ej. `GestionEscolar`, `CRM-Mayoristas`)
- [ ] Dominio (1-2 oraciones de qué resuelve)
- [ ] Versión objetivo (V1 / V2 / V3 / V4) — recomendar V1 para empezar
- [ ] BD: PostgreSQL local, Docker, RDS — para pre-poblar `.env.example`
- [ ] Stack frontend confirmado (React 19 + Vite por default)

## Pasos

1. **Crear estructura de carpetas** según `CLAUDE.md §13.1`:
   ```
   <nuevo-proyecto>/
   ├── CLAUDE.md
   ├── .claude/
   ├── .husky/
   ├── Dev/
   │   ├── migrations/
   │   ├── src/
   │   └── frontend/
   └── Prod/
   ```

2. **Copiar archivos base**:
   - `CLAUDE.md` (este, v3.0 — método completo)
   - `.claude/skills/*` (todos los 22+ skills)
   - `.claude/agents/*`
   - `.claude/settings.local.json` (sin secretos)
   - `.husky/pre-commit`

3. **Copiar las 11 migraciones bootstrap** a `Dev/migrations/`:
   ```
   001_initial_schema.sql
   002_seed_roles.sql
   003_seed_configuracion.sql
   004_fix_refresh_token_length.sql
   005_metadata_y_protecciones.sql
   006_notas_tablas_sistema.sql
   007_metadata_nivel_2.sql
   008_protecciones_metadata.sql
   009_clasificacion_lfpdppp.sql
   010_cobertura_total_metadata.sql
   011_fix_regex_doble_escape.sql
   ```

4. **Generar archivos de configuración base**:
   - `Dev/package.json` con scripts de §13.5
   - `Dev/.env.example` con DB_*, JWT_*, REDIS_*, SYSTEM_MODE
   - `Dev/frontend/package.json` con scripts de §13.5
   - `Dev/frontend/tokens/colors.json` (paleta neutra)
   - `Dev/frontend/eslint.config.js`, `eslint-rules/`, `plopfile.js`

5. **Aplicar las 11 migraciones** a la BD destino (preguntar antes):
   ```bash
   for f in Dev/migrations/[0-9]*.sql; do
     PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f "$f"
   done
   ```

## Output esperado

- Estructura completa según CLAUDE.md §13.1
- BD con las 11 migraciones aplicadas
- 30 tablas registradas en `tablas_sistema` (8 metadata) — listas para
  agregar las del dominio en Fase 1

## Verificación

Tras correr el skill:

```sql
-- Las 11 migraciones aplicadas
SELECT count(*) FROM tablas_sistema;     -- ≥ 8 (las metadata)
SELECT version FROM metadata_versiones;  -- 1.0 y 1.1

-- 17 checks de cobertura BD: todos en 0
SELECT count(*) FROM (
  SELECT 'gap1' AS k, count(*) AS gap FROM (
    SELECT table_name, column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name IN (SELECT nombre_tabla FROM tablas_sistema)
    EXCEPT SELECT nombre_tabla, nombre_campo FROM campos_sistema) x
  UNION ALL SELECT 'gap2', count(*) FROM campos_sistema
   WHERE (visible_en_lista=1 OR visible_en_form=1) AND mensaje_ayuda IS NULL
) y WHERE gap > 0;
-- Esperado: 0
```

## Siguiente paso

Después de este skill, invocar `/meta` para diseñar la metadata específica
del dominio del proyecto (Fase 1).

## Prohibido

- ✗ Copiar `.env` con valores reales (solo `.env.example` con placeholders)
- ✗ Copiar `keys/private.key` o `keys/public.key` (regenerar con
  `npm run generate-keys`)
- ✗ Saltar las 11 migraciones — son la base de todo el método
