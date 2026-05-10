---
name: audit-pendientes-revision-exhaustiva
description: >
  Activar para auditar exhaustivamente el sistema antes de un release.
  Lanza dos agents en paralelo (uno para docs, uno para backend) que detectan
  inconsistencias entre la metadata viva, el código y la documentación.
  Entrega plan priorizado ALTA/MEDIA/BAJA con archivo:línea para cada hallazgo.
  Comandos de activación: /audit-pendientes
---

# SKILL — Auditoría exhaustiva pre-release (QA cross-fase)

**Fase del método:** QA (cross-fase)
**Modo asociado:** `/sis`
**Activación:** `/audit-pendientes`

## Pre-condiciones

- Tests del backend en verde (al menos al inicio)
- Acceso a la BD viva del sistema
- Git con historial reciente

## Pasos

1. **Capturar estado actual**:
   ```bash
   cd Dev/
   npm test 2>&1 | tail -3
   psql -c "SELECT count(*) FROM tablas_sistema, campos_sistema, variables_sistema, semaforos_sistema, procesos_sistema, componentes_sistema, metadata_versiones"
   git log --oneline -10
   ```

2. **Lanzar 2 agents en paralelo** (usar `Agent` tool):

### Agent A — Auditoría de documentación
```
Eres un auditor revisando documentación de un proyecto.
Repositorio: <path>
Tarea: revisar TODOS los docs en docs/* y reportar:
- Conteos desactualizados (tablas, campos, tests, semáforos)
- Versiones obsoletas en headers/footers
- Conceptos mencionados sin estar reflejados en metadata viva
- Coherencia entre docs (un doc dice X, otro dice Y sobre el mismo tema)
Estado actual del sistema (la fuente de verdad):
- N tablas registradas en tablas_sistema
- M filas en campos_sistema
- 9 semáforos, 9 variables, 22 componentes, 4 procesos
- Versión metadata: <version>
- Tests: <count>/<count>
Formato: archivo:línea — severidad ALTA/MEDIA/BAJA — descripción.
Lista priorizada (max 20). Bajo 1500 palabras.
```

### Agent B — Auditoría de backend
```
Eres un auditor revisando código backend.
Repositorio: <path>
Tarea: detectar incongruencias entre código y metadata viva.
Específicamente:
A) Validaciones hardcoded que duplican campos_sistema
B) Constantes en src/config/ desalineadas con BD
C) Módulo metadata: ¿SELECTs traen todas las columnas?
D) Otros módulos: ¿respetan protegido, sensible_lfpdppp?
E) ¿Algún código escribe en metadata sin SET LOCAL flag?
F) ¿package.json refleja la versión real del release?
G) ¿Tests con counts hardcoded que se rompen ante migraciones?
Formato: archivo:línea — severidad — sugerencia.
Lista priorizada (max 25). Bajo 1500 palabras.
```

3. **Consolidar hallazgos** de ambos agents en una tabla única:
   | # | Severidad | Tipo | Archivo:línea | Acción sugerida |

4. **Verificación BD** (17 checks, paralelo a los agents):
   ```sql
   -- Los 17 checks de cobertura (ver /meta-validate)
   ```

5. **Reporte final** con:
   - Conteo agregado de hallazgos por severidad
   - Lista priorizada (ALTA primero)
   - Decisión recomendada: ¿se puede release o no?

## Output esperado

```
✅ AUDITORÍA COMPLETA — <fecha>

Estado BD: 17/17 checks en 0
Estado tests: <X>/<X> verde
Estado git: branch main limpia, último tag v<X.Y.Z>

Hallazgos:
  ALTA:  <N>  → bloqueadores para release
  MEDIA: <N>  → recomendado cerrar antes de release
  BAJA:  <N>  → cosméticos, no bloquean

Plan priorizado:
  1. [ALTA] <archivo:línea> — <descripción> → <acción>
  2. [ALTA] ...
  ...

Recomendación: PROCEDER / BLOQUEAR / RESOLVER MEDIA ANTES
```

## Verificación

El reporte ES la verificación. Para cerrar el ciclo:

1. Crear PR que cierre los hallazgos ALTA (mínimo)
2. Re-correr `/audit-pendientes`
3. Si reporte = "PROCEDER", continuar al release

## Reglas

- ✓ Lanzar SIEMPRE los 2 agents en paralelo (no secuencial)
- ✓ Incluir archivo:línea exacto en cada hallazgo
- ✓ Distinguir entre "incongruente con metadata" (ALTA) y "cosmético" (BAJA)
- ✗ Permitir release con cualquier hallazgo ALTA abierto
- ✗ Considerar "MEDIA" como bloqueante automático — solo si afecta operación
