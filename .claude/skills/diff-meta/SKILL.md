---
name: diff-meta
description: >
  Activar para ver qué cambió en la metadata desde la última migración aplicada.
  Compara el estado actual de campos_sistema/tablas_sistema contra el último commit que
  los modificó. Útil al iniciar sesión "¿qué hizo el otro agente con la metadata desde que
  yo trabajé?". Read-only.
  Comandos de activación: /diff-meta
---

# SKILL — Diff de metadata desde último cambio

Muestra qué cambió en `tablas_sistema`, `campos_sistema`, `procesos_sistema`,
`semaforos_sistema`, `variables_sistema`, `componentes_sistema`,
`metadata_versiones` desde el último commit que las tocó.

## Invocación

```
/diff-meta
```

Sin argumentos. Detecta automáticamente el rango.

## Procedimiento

```bash
# Última migración aplicada
LAST_MIG=$(ls Dev/migrations/*.up.sql | sort | tail -1)
LAST_MIG_DATE=$(git log -1 --format=%cd --date=iso "$LAST_MIG")

# Versión de metadata en BD
DB_VER=$(psql -tAc "SELECT version FROM metadata_versiones ORDER BY fecha DESC LIMIT 1")

# Comparar
echo "Última migración:    $(basename $LAST_MIG) ($LAST_MIG_DATE)"
echo "Versión actual BD:   $DB_VER"
echo
echo "Filas en metadata:"
psql -tAc "
  SELECT
    'tablas_sistema'      AS tabla, COUNT(*) AS rows FROM tablas_sistema     UNION ALL
  SELECT 'campos_sistema'      , COUNT(*) FROM campos_sistema      UNION ALL
  SELECT 'procesos_sistema'    , COUNT(*) FROM procesos_sistema    UNION ALL
  SELECT 'semaforos_sistema'   , COUNT(*) FROM semaforos_sistema   UNION ALL
  SELECT 'variables_sistema'   , COUNT(*) FROM variables_sistema   UNION ALL
  SELECT 'componentes_sistema' , COUNT(*) FROM componentes_sistema UNION ALL
  SELECT 'metadata_versiones'  , COUNT(*) FROM metadata_versiones
"
echo
echo "Cambios desde la última migración:"
git log --oneline --since="$LAST_MIG_DATE" -- Dev/migrations/
```

## Output esperado

```
Última migración:    0023_extiende_trigger_audit.up.sql (2026-05-11)
Versión actual BD:   2.1.5

Filas en metadata:
  tablas_sistema      | 13
  campos_sistema      | 109
  procesos_sistema    | 4
  semaforos_sistema   | 10
  variables_sistema   | 8
  componentes_sistema | 25
  metadata_versiones  | 23

Cambios desde la última migración:
  abc1234 feat(be): mig 0024 — agrega tabla productos_extras
  def5678 chore(be): regenera snapshot

Tablas tocadas en commits recientes:
  - tablas_sistema:   +1 fila (productos_extras)
  - campos_sistema:   +6 filas (productos_extras: id, nombre, ...)
  - metadata_versiones: +1 fila (2.1.6)
```

## Reglas

- Read-only.
- < 5 segundos.
- Si BD no accesible, reportar "BD offline" sin fallar.
