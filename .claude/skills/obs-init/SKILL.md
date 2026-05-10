---
name: obs-init-observabilidad-desde-metadata
description: >
  Activar para inicializar la observabilidad del sistema basada en
  semaforos_sistema, procesos_sistema y (si está implementado el nivel 9)
  metricas_definidas, slos. Genera dashboard inicial, alerts.yml, y queries
  para Prometheus/Grafana o equivalentes. Si el nivel 9 no está, se queda
  en lo básico que sí permite el nivel 2.
  Comandos de activación: /obs-init
---

# SKILL — Inicialización de observabilidad (Fase 5 / V3-V4)

**Fase del método:** 5 (programación) o V3-V4
**Modo asociado:** `/dev`
**Activación:** `/obs-init`

## Pre-condiciones

- Fase 5 con módulos backend operativos (/health respondiendo)
- Decisión sobre stack de observabilidad declarada en `componentes_sistema`:
  - V1-V2: solo logs estructurados (pino) + semáforos calculados on-demand
  - V3+: Redis para métricas en cache
  - V4 (nivel 9): Prometheus + Grafana + Loki

## Diagnóstico obligatorio

Preguntar (o leer de metadata):

- [ ] **Nivel de metadata vigente**:
  ```sql
  SELECT MAX(CAST(SUBSTRING(version FROM '^[0-9]+') AS INT))
    FROM metadata_versiones;
  ```
- [ ] **¿Existe nivel 9 (`metricas_definidas`, `slos`)?** Si sí, configuración
  completa. Si no, configuración mínima.
- [ ] **Stack de observabilidad declarado** en `componentes_sistema`

## Pasos

1. **Leer semáforos vigentes** (siempre disponibles, mínimo nivel 2):
   ```sql
   SELECT codigo, nombre, sentido, unidad,
          umbral_verde_max, umbral_amarillo_max,
          fuente_datos, frecuencia_calculo
     FROM semaforos_sistema WHERE activo=1;
   ```

2. **Leer procesos** y su frecuencia esperada:
   ```sql
   SELECT codigo, frecuencia, duracion_estimada_min,
          ultima_ejecucion, proxima_ejecucion
     FROM procesos_sistema WHERE activo=1;
   ```

3. **Generar dashboard YAML** según el stack:

### Caso A — V1/V2 (sin nivel 9)
Generar endpoints internos `/internal/observability/semaforos` y
`/internal/observability/procesos` que devuelvan los valores actuales:

```javascript
// src/modules/observability/controller.js
export async function getSemaforos(req, res) {
  // Ejecutar el query declarado en cada semaforos_sistema.fuente_datos
  // y comparar contra umbrales. Retornar VERDE/AMARILLO/ROJO por código.
}
```

### Caso B — V3+ (con nivel 6 + observabilidad básica)
Configurar caché en Redis con TTL = frecuencia_calculo del semáforo
y generar archivo `prometheus-alerts.yml` con alertas derivadas:

```yaml
groups:
  - name: <proyecto>-semaforos
    rules:
      - alert: SaludApiDegradada
        expr: api_health_p95_ms > 1000
        for: 5m
        annotations:
          summary: "{{ $labels.instance }} con p95 > 1000ms"
          # del campo nota_operador del semáforo
          runbook: "Si SALUD_API está en ROJO, reportar a soporte"
```

### Caso C — V4 (nivel 9 implementado)
Lectura completa de `metricas_definidas` + `slos`:

```sql
SELECT codigo, expr_promql, ventana, tipo_slo, target_slo
  FROM metricas_definidas;

SELECT slo_codigo, target, ventana_evaluacion
  FROM slos WHERE activo=1;
```

Generar:
- `monitoring/dashboards/<proyecto>-overview.json` (Grafana)
- `monitoring/prometheus/alerts.yml`
- `monitoring/prometheus/rules.yml` con recording rules
- `monitoring/runbooks/<semaforo>.md` desde `nota_operador`

4. **Validar** que cada semáforo tiene su receptor:
   ```sql
   SELECT s.codigo, s.fuente_datos
     FROM semaforos_sistema s WHERE s.activo=1;
   ```
   Y que los archivos generados cubren cada uno.

## Output esperado

### Caso A (V1/V2)
- `src/modules/observability/queries.js`
- `src/modules/observability/service.js` (calcula semáforos on-demand)
- `src/modules/observability/controller.js`
- `src/modules/observability/routes.js` con endpoints internos

### Caso B (V3+)
- Lo anterior + `monitoring/prometheus-alerts.yml`
- Cron/job que actualiza Redis con valores calculados

### Caso C (V4)
- `monitoring/dashboards/*.json`
- `monitoring/prometheus/{alerts,rules}.yml`
- `monitoring/runbooks/*.md` por semáforo

## Verificación

```bash
# Caso A
curl http://localhost:3001/internal/observability/semaforos -H "Auth..."
# Esperado: JSON con 9 semáforos y su estado actual

# Caso B/C
promtool check rules monitoring/prometheus/rules.yml
promtool check config monitoring/prometheus/prometheus.yml
```

## Reglas

- ✗ Generar dashboards que monitoreen métricas no declaradas en
  `metricas_definidas` (cuando nivel 9 está vigente)
- ✗ Hardcodear umbrales que ya están en `semaforos_sistema`
- ✓ Cada alerta tiene un runbook derivado de `nota_operador`
- ✓ Si el sistema está en V1/V2, no proponer Prometheus — derivar a `/meta`
  para subir nivel primero
