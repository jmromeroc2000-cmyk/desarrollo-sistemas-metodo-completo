---
name: arq-derive-arquitectura-desde-metadata
description: >
  Activar para diseñar la arquitectura del sistema derivada estrictamente de
  la metadata existente. Lee tablas_sistema (función operativa), procesos_sistema,
  semaforos_sistema, componentes_sistema, variables_sistema y propone capas,
  módulos, decisiones de cache/queue/escalado justificadas contra cada función
  detectada. NO propone capacidades cuyo nivel de metadata no esté declarado.
  Comandos de activación: /arq-derive
---

# SKILL — Arquitectura derivada de metadata (Fase 2)

**Fase del método:** 2 (arquitectura)
**Modo asociado:** `/arq`
**Activación:** `/arq-derive`

## Pre-condiciones

- Fase 1 completa: `/meta-validate` da 0 gaps
- Tablas del dominio registradas en `tablas_sistema`

## Pasos

1. **Inventario derivado de metadata**:
   ```sql
   -- ¿Qué tipos de tablas tiene el sistema?
   SELECT funcion, count(*), array_agg(nombre_tabla)
     FROM tablas_sistema GROUP BY funcion;

   -- ¿Hay procesos pesados?
   SELECT codigo, frecuencia, requiere_modo, duracion_estimada_min
     FROM procesos_sistema WHERE activo=1;

   -- ¿Qué se monitorea?
   SELECT codigo, sentido, frecuencia_calculo
     FROM semaforos_sistema WHERE activo=1;

   -- ¿Stack ya declarado?
   SELECT codigo, categoria, version, critico
     FROM componentes_sistema WHERE activo=1
     ORDER BY categoria, codigo;

   -- ¿Variables que requieren reinicio?
   SELECT clave, tipo_dato FROM variables_sistema WHERE requiere_reinicio=1;

   -- ¿Nivel vigente de metadata?
   SELECT version, niveles FROM metadata_versiones
    ORDER BY fecha DESC LIMIT 1;
   ```

2. **Derivar capas** según patrones detectados:

   - **Si hay TRANSACCIONAL con CONFIRMADA/CANCELADA** → módulos con
     state machine, idempotencia obligatoria
   - **Si hay AUDITORIA** → triggers BD insertando histórico, retention policy
   - **Si hay procesos con `requiere_modo='MAINTENANCE'`** → exponer
     endpoints de control de modo
   - **Si hay variables con `requiere_reinicio=1`** → mecanismo de reload
     o reinicio de PM2
   - **Si hay >3 procesos pesados (semáforo CARGA_PROCESOS_PESADOS)** →
     justificar cola tipo BullMQ
   - **Si hay datos PII (`sensible_lfpdppp=1`)** → cifrado en reposo,
     enmascarado en respuestas

3. **Bloquear propuestas no soportadas por la metadata**:

   | Capacidad propuesta | Nivel de metadata requerido |
   |---------------------|-----------------------------|
   | Cache distribuido | Nivel 6 (`politicas_cache`) |
   | Particionamiento temporal | Nivel 7 (`particiones_tiempo`) |
   | Multi-schema PG | Nivel 5 (`esquemas_bd`) |
   | CDN/edge | Nivel 8 (`nodos_cdn`) |
   | SLOs codificados | Nivel 9 (`slos`) |

   Si el sistema está en V1 (niveles 1-2) y el usuario pide "agregar cache",
   **bloquear** y devolver a `/meta` para subir el sistema a V3.

4. **Producir output**:

   - Diagrama ASCII de capas
   - Lista de módulos backend propuestos (un módulo por TRANSACCIONAL)
   - Decisiones APA con justificación contra cada función detectada
   - Tabla de "deudas de metadata" si alguna decisión arquitectónica
     requiere subir nivel

## Output esperado

```
[INVENTARIO]
- 8 CATALOGO, 3 TRANSACCIONAL, 4 DETALLE, 2 ESTADO, 1 RELACION
- 4 procesos: 1 diario + 2 mensuales + 1 anual
- 9 semáforos: 4 BAJO_BUENO + 2 ALTO_BUENO
- 22 componentes en 5 categorías
- Versión metadata: 1.1 (V1)

[CAPAS]
┌─ Frontend (React + TanStack Query)
├─ API Gateway (Express + RFC 9457)
├─ Service layer (validación derivada de campos_sistema)
├─ Queries (SQL parametrizado, 4 archivos por módulo)
└─ PostgreSQL 16

[DECISIONES]
1. Costo promedio ponderado en service layer (transaccional → estado)
2. JWT RS256 con refresh tokens (declarado en componentes_sistema)
3. Modo MAINTENANCE para CIERRE_MES y CIERRE_ANUAL (requiere_modo BD)
4. Sin cache distribuido (Nivel 6 no implementado — V1)
5. Sin particionamiento (Nivel 7 no implementado — V1)

[DEUDAS DE METADATA]
- Si se quiere cache: subir a V3 (niveles 5+6+7)
- Si se quiere observabilidad avanzada: subir a V4 (nivel 9)
```

## Verificación

El output es revisable por humanos. Para validar coherencia interna,
todos los componentes mencionados deben existir en `componentes_sistema`
o en deuda explícita.

## Reglas

- ✗ Proponer capacidad cuyo nivel de metadata no esté declarado
- ✗ Inventar componentes que no estén en `componentes_sistema`
- ✓ Si la metadata declara `componentes_sistema.critico=1`, agregar
  consideración explícita de continuidad para ese componente
