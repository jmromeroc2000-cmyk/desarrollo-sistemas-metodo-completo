---
name: stack-pick-componentes-segun-metadata
description: >
  Activar para seleccionar el stack tecnológico definitivo del proyecto y
  registrarlo en componentes_sistema. Lee patrones de la metadata (nivel,
  funciones, procesos, variables) y propone componentes por categoría
  (INFRAESTRUCTURA/BASE_DE_DATOS/BACKEND/FRONTEND/PRUEBAS) con sus versiones,
  licencias y propósitos. Genera la migración con los inserts correspondientes.
  Comandos de activación: /stack-pick
---

# SKILL — Selección de stack y poblado de componentes_sistema (Fase 3)

**Fase del método:** 3 (stack y herramientas)
**Modo asociado:** `/dev`
**Activación:** `/stack-pick`

## Pre-condiciones

- Fase 2 completa: arquitectura derivada disponible
- `componentes_sistema` existe (mig 007 aplicada) pero puede estar
  parcialmente poblada o vacía

## Diagnóstico obligatorio

Preguntar:

- [ ] **Versión objetivo del sistema** (V1/V2/V3/V4)
- [ ] **Restricciones existentes** (licencias permitidas, vendors prohibidos)
- [ ] **Lenguajes/frameworks confirmados** (default: Node 20 LTS + Express 4 +
  PostgreSQL 16 + React 19 + Vite 8)
- [ ] **¿Hay infraestructura corporativa que reusar?** (Redis cluster,
  observability stack, etc.)

## Pasos

1. **Detectar capacidades requeridas desde metadata**:

   | Patrón en metadata | Componente sugerido |
   |--------------------|---------------------|
   | Procesos con `requiere_modo='MAINTENANCE'` | PM2 (cluster mode) |
   | Semáforo `CARGA_PROCESOS_PESADOS` activo | BullMQ + Redis |
   | Semáforo `TOMA_RESPALDOS` activo | pg_dump + cron + S3 (o equivalente) |
   | Nivel 6 declarado (`politicas_cache`) | Redis Cache |
   | Nivel 7 declarado (`particiones_tiempo`) | pg_partman |
   | Nivel 8 declarado (`nodos_cdn`) | CloudFront / Cloudflare |
   | Nivel 9 declarado (`slos`) | Prometheus + Grafana + Loki |
   | Tablas `AUDITORIA` | Triggers BD ya cubren; sin componente extra |
   | TRANSACCIONALES con concurrencia | Connection pool tuning + lock strategy |

2. **Generar tabla propuesta por categoría**:
   ```
   INFRAESTRUCTURA: Node 20 LTS · PM2 · nginx
   BASE_DE_DATOS:   PostgreSQL 16 · Redis 7 (si nivel 6) · pg_partman (si nivel 7)
   BACKEND:         Express 4 · pg 8 · jsonwebtoken 9 · bcrypt 5 · pino 9
                    + BullMQ (si requiere_modo de procesos)
   FRONTEND:        React 19 · Vite 8 · Tailwind v4 · TanStack Query v5 · Plop
   PRUEBAS:         Vitest 4 · Supertest 7 · Playwright 1.49 · axe-core · knip · ESLint 9
   ```

3. **Generar migración** `Dev/migrations/0XX_stack_<dominio>.sql`:
   ```sql
   BEGIN;
   SET LOCAL app.allow_metadata_change = 'true';

   INSERT INTO componentes_sistema
     (codigo, nombre, categoria, subcategoria, version, proveedor, licencia,
      url_documentacion, proposito,
      mensaje_ayuda, nota_admin, nota_programador, nota_operador,
      critico, activo)
   VALUES
   ('NODE','Node.js','INFRAESTRUCTURA','runtime','20 LTS','OpenJS Foundation','MIT',
    'https://nodejs.org/docs/latest-v20.x/api/','Runtime JavaScript del backend.',
    '...','...','...','...',1,1),
   -- ... un VALUES por componente decidido ...
   ;

   COMMIT;
   ```

4. **Aplicar y validar**:
   ```sql
   SELECT categoria, count(*) FROM componentes_sistema
    WHERE activo=1 GROUP BY categoria ORDER BY categoria;
   ```

5. **Bloquear propuestas no justificadas por metadata**:
   - Si propones Redis pero el nivel 6 no está declarado → preguntar si
     subir el sistema a V3 antes
   - Si propones SaaS observability pero nivel 9 no está → derivar a `/meta`

## Output esperado

- Tabla de componentes propuestos con justificación
- Migración SQL con los inserts en `componentes_sistema`
- Lista de "componentes condicionales" que requieren subir nivel de metadata

## Verificación

```sql
-- Stack declarado (esperado: ≥10 componentes para V1, más para V2-V4)
SELECT count(*) FROM componentes_sistema WHERE activo=1;

-- Componentes críticos identificados
SELECT codigo, nombre, version FROM componentes_sistema
 WHERE critico=1 AND activo=1;
```

## Reglas

- ✗ Proponer componentes sin licencia compatible con el proyecto
- ✗ Sugerir versiones EOL o sin soporte LTS
- ✓ Cada componente con `critico=1` debe tener plan de continuidad explícito
  (referencia a `docs/19-continuidad-negocio.md`)
- ✓ Cada `nota_admin` describe rotación, monitoreo y dependencias
