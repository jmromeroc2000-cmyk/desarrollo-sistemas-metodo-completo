---
name: modos-globales-sistema
description: >
  Activar cuando el usuario pida: definir o revisar las variables globales de
  modo del sistema (debug, performance, mantenimiento); implementar el comportamiento
  de un módulo según el modo activo; configurar logging estructurado; optimizar
  código para modo performance; diseñar el mecanismo de captura de cambios a BD
  en modo mantenimiento; o cualquier tarea donde la configuración operacional
  global del sistema sea el objetivo.
  Referenciado por todos los skills de programación.
  Comandos de activación: /dev-modes · [MODO: MODOS GLOBALES]
---

# SKILL — Modos globales del sistema

## 1. Principio rector

Todo sistema debe definir **tres modos de operación globales** que controlan
el comportamiento de cada programa, módulo y componente. Estos modos son
**obligatorios**, **mutuamente excluyentes** y **configurables sin recompilar**.

```
REGLA FUNDAMENTAL:
  □ Los 3 modos existen en TODOS los sistemas, sin excepción
  □ Solo un modo puede estar activo a la vez
  □ El modo activo se configura externamente (variable de entorno o parámetro)
  □ El código de cada módulo consulta el modo y ajusta su comportamiento
  □ Nunca se hardcodea el modo dentro del código fuente
```

---

## 2. Definición de los 3 modos globales

### 2.1 MODO DEBUG

**Propósito:** Proporcionar información suficiente para el análisis de fallos,
comportamiento anómalo y rendimiento durante el desarrollo y diagnóstico.

```
COMPORTAMIENTO OBLIGATORIO EN MODO DEBUG:

  LOGGING — nivel: DEBUG (el más detallado):
    □ Registrar ENTRADA y SALIDA de cada función relevante con sus parámetros
    □ Registrar cada query SQL ejecutada con sus parámetros reales (nunca
      parámetros vacíos — expandir los bind variables)
    □ Registrar tiempos de ejecución de cada operación significativa (ms)
    □ Registrar el estado del sistema en puntos de decisión clave
    □ Registrar stack trace completo en toda excepción, incluyendo causa raíz
    □ Registrar el hilo/proceso que ejecuta cada operación
    □ Registrar el usuario que originó la operación

  TRAZABILIDAD:
    □ Cada operación lleva un correlation_id único que la identifica en todos
      los sistemas involucrados (útil en arquitecturas distribuidas)
    □ El correlation_id se propaga en todas las llamadas a servicios externos
    □ Registrar el tiempo total de cada request de extremo a extremo

  INFORMACIÓN DE PERFORMANCE EN DEBUG:
    □ Tiempo de cada query a BD (ms)
    □ Número de queries ejecutadas por operación (detectar N+1)
    □ Uso de memoria antes y después de operaciones intensivas
    □ Hit/miss de caché por operación
    □ Tamaño de los datasets procesados

  INFORMACIÓN DE COMPORTAMIENTO NORMAL:
    □ Flujo de ejecución: qué ramas de decisión se tomaron y por qué
    □ Valores de variables en puntos de control
    □ Resultado de validaciones (incluso las que pasan correctamente)
    □ Estado de conexiones a BD y servicios externos
    □ Configuración activa al inicio de cada proceso

  RESTRICCIONES EN MODO DEBUG:
    ✗ NUNCA activar en producción con datos reales de usuarios sin enmascarar PII
    ✗ NUNCA loggear contraseñas, tokens, números de tarjeta ni datos sensibles
      (enmascarar: "token: eyJ***...***xyz", "password: ****")
    ✗ NUNCA enviar logs de debug a sistemas de analítica de usuarios
```

### 2.2 MODO PERFORMANCE

**Propósito:** Maximizar la eficiencia del sistema minimizando toda operación
que no sea estrictamente necesaria para el resultado correcto.

```
COMPORTAMIENTO OBLIGATORIO EN MODO PERFORMANCE:

  LOGGING — nivel: WARNING (solo problemas):
    □ Registrar únicamente errores y advertencias
    □ Sin logs de entrada/salida de funciones
    □ Sin logs de queries individuales (solo errores de BD)
    □ Sin tiempos de operaciones individuales en el flujo normal
    Razón: el I/O de logging tiene costo real de CPU y disco

  OPTIMIZACIONES OBLIGATORIAS:
    □ Activar caché agresivo donde sea correcto hacerlo
      (caché de queries, caché de resultados de operaciones costosas)
    □ Usar lazy loading: no cargar datos hasta que sean necesarios
    □ Usar streaming/paginación para colecciones: nunca cargar todo en memoria
    □ Reutilizar conexiones a BD (connection pool siempre activo)
    □ Minimizar serialización/deserialización innecesaria
    □ Preferir operaciones en lote (batch) sobre operaciones individuales en loops
    □ Desactivar validaciones redundantes que ya se verificaron upstream
    □ Usar índices en BD y verificar que el query planner los usa

  RESTRICCIONES EN MODO PERFORMANCE:
    □ No sacrificar correctitud por velocidad — si hay duda, es un bug
    □ No omitir validaciones de seguridad (autenticación/autorización)
    □ No omitir logging de errores y excepciones
    □ Documentar cada optimización que reduzca legibilidad del código
    □ Toda optimización debe estar respaldada por una prueba de performance
      que demuestre la mejora (ver skill /dev-test sección 5)

  MÉTRICAS A MANTENER EN MODO PERFORMANCE:
    □ Latencia p95 < SLA definido
    □ Uso de memoria dentro de límites configurados
    □ Throughput >= objetivo definido para el sistema
```

### 2.3 MODO MANTENIMIENTO

**Propósito:** Capturar todas las modificaciones a la base de datos generadas
durante la operación en un espacio de almacenamiento definido, para su
revisión y aplicación controlada posterior.

```
COMPORTAMIENTO OBLIGATORIO EN MODO MANTENIMIENTO:

  CAPTURA DE CAMBIOS A BASE DE DATOS:
    □ NINGÚN cambio (INSERT, UPDATE, DELETE, DDL) se aplica directamente a la BD
    □ Todo cambio se genera como script SQL y se deposita en el
      ESPACIO DE MANTENIMIENTO definido
    □ El sistema opera con datos de solo lectura (SELECT) durante este modo
    □ Las operaciones que requieren escritura retornan respuesta de
      "operación pendiente" al usuario

  ESPACIO DE MANTENIMIENTO (estructura obligatoria):
    Directorio o tabla de staging:
      /mantenimiento/
        YYYYMMDD_HHMMSS_<modulo>_<operacion>.sql  ← script de cambios
        YYYYMMDD_HHMMSS_<modulo>_<operacion>.log  ← contexto y metadata

    Cada script generado debe incluir:
      -- METADATA OBLIGATORIA AL INICIO DE CADA SCRIPT:
      -- Generado:      <timestamp con zona horaria>
      -- Sistema:       <nombre del sistema y versión>
      -- Módulo:        <nombre del módulo que generó el cambio>
      -- Operación:     <descripción de la operación de negocio>
      -- Usuario:       <usuario que originó la operación>
      -- Correlation-ID:<id único de la operación>
      -- Modo:          MANTENIMIENTO
      -- Revisado por:  [PENDIENTE DE FIRMA]
      -- Aplicado en:   [PENDIENTE]

      BEGIN;
        -- Script SQL generado
        INSERT INTO tabla (col1, col2) VALUES ('val1', 'val2');
        UPDATE otra_tabla SET campo = 'nuevo' WHERE id = 'xxx';
      COMMIT;

      -- ROLLBACK CORRESPONDIENTE:
      -- BEGIN;
      --   DELETE FROM tabla WHERE id = 'yyy';
      --   UPDATE otra_tabla SET campo = 'anterior' WHERE id = 'xxx';
      -- COMMIT;

  PROCESO DE APLICACIÓN DE SCRIPTS:
    □ Los scripts se acumulan en el espacio de mantenimiento
    □ Un administrador revisa y firma cada script antes de aplicarlo
    □ Los scripts se aplican en orden cronológico estricto
    □ Cada script aplicado se marca con: quién lo aplicó, cuándo, resultado
    □ Si un script falla → detener la aplicación, no continuar con el siguiente

  LOGGING EN MODO MANTENIMIENTO — nivel: INFO:
    □ Registrar cada operación que generó un script
    □ Registrar el nombre del script generado
    □ Registrar el usuario y timestamp de cada operación
    □ Registrar qué operaciones fueron rechazadas por requerir escritura
```

---

## 3. Implementación — variables globales de modo

### 3.1 Definición como variable de entorno (portable SQL-92 y multi-lenguaje)

```
VARIABLE DE ENTORNO (fuente de verdad):
  SYSTEM_MODE = DEBUG | PERFORMANCE | MAINTENANCE

  Valores válidos:
    DEBUG        → modo debug activo
    PERFORMANCE  → modo performance activo
    MAINTENANCE  → modo mantenimiento activo

  Valor por defecto si no está definida: PERFORMANCE
  (fail-safe: si no se configura, el sistema opera eficientemente)

TABLA DE CONFIGURACIÓN EN BASE DE DATOS (SQL-92 portable):
  CREATE TABLE configuracion_sistema (
      clave       VARCHAR(100)  NOT NULL,
      valor       VARCHAR(500)  NOT NULL,
      descripcion VARCHAR(500)  NOT NULL,
      modificado_en  TIMESTAMP  NOT NULL,
      modificado_por CHAR(36)   NOT NULL,
      CONSTRAINT pk_configuracion_sistema PRIMARY KEY (clave)
  );

  -- Registros obligatorios:
  INSERT INTO configuracion_sistema
      (clave, valor, descripcion, modificado_en, modificado_por)
  VALUES
      ('SYSTEM_MODE',
       'PERFORMANCE',
       'Modo de operación del sistema. Valores: DEBUG | PERFORMANCE | MAINTENANCE',
       CURRENT_TIMESTAMP,
       '<id-usuario-admin>'),
      ('DEBUG_LOG_LEVEL',
       'DEBUG',
       'Nivel de log en modo DEBUG. Valores: DEBUG | INFO | WARNING | ERROR',
       CURRENT_TIMESTAMP,
       '<id-usuario-admin>'),
      ('MAINTENANCE_OUTPUT_PATH',
       '/var/system/mantenimiento',
       'Ruta donde se depositan los scripts generados en modo MAINTENANCE',
       CURRENT_TIMESTAMP,
       '<id-usuario-admin>'),
      ('PERFORMANCE_CACHE_TTL_SECONDS',
       '300',
       'Tiempo de vida del caché en segundos en modo PERFORMANCE',
       CURRENT_TIMESTAMP,
       '<id-usuario-admin>');
```

### 3.2 Lectura del modo en código — patrón obligatorio por lenguaje

```python
# Python — módulo de configuración global (config.py)
import os
from enum import Enum

class SystemMode(Enum):
    DEBUG       = "DEBUG"
    PERFORMANCE = "PERFORMANCE"
    MAINTENANCE = "MAINTENANCE"

def get_system_mode() -> SystemMode:
    """Lee el modo del sistema desde la variable de entorno.
    Fail-safe: retorna PERFORMANCE si no está configurada."""
    raw = os.getenv("SYSTEM_MODE", "PERFORMANCE").upper().strip()
    try:
        return SystemMode(raw)
    except ValueError:
        # Valor inválido → loggear advertencia y usar fail-safe
        import warnings
        warnings.warn(f"SYSTEM_MODE='{raw}' no es válido. Usando PERFORMANCE.")
        return SystemMode.PERFORMANCE

# Constante global — leer UNA sola vez al inicio, no en cada llamada
SYSTEM_MODE: SystemMode = get_system_mode()

# Helpers booleanos para uso en código
IS_DEBUG       = SYSTEM_MODE == SystemMode.DEBUG
IS_PERFORMANCE = SYSTEM_MODE == SystemMode.PERFORMANCE
IS_MAINTENANCE = SYSTEM_MODE == SystemMode.MAINTENANCE
```

```javascript
// JavaScript / TypeScript — config.ts
export enum SystemMode {
  DEBUG       = "DEBUG",
  PERFORMANCE = "PERFORMANCE",
  MAINTENANCE = "MAINTENANCE",
}

function getSystemMode(): SystemMode {
  const raw = (process.env.SYSTEM_MODE ?? "PERFORMANCE").toUpperCase().trim();
  if (Object.values(SystemMode).includes(raw as SystemMode)) {
    return raw as SystemMode;
  }
  console.warn(`SYSTEM_MODE='${raw}' no es válido. Usando PERFORMANCE.`);
  return SystemMode.PERFORMANCE;
}

// Leer UNA sola vez al inicio del proceso
export const SYSTEM_MODE: SystemMode = getSystemMode();
export const IS_DEBUG       = SYSTEM_MODE === SystemMode.DEBUG;
export const IS_PERFORMANCE = SYSTEM_MODE === SystemMode.PERFORMANCE;
export const IS_MAINTENANCE = SYSTEM_MODE === SystemMode.MAINTENANCE;
```

```java
// Java — SystemConfig.java
public enum SystemMode { DEBUG, PERFORMANCE, MAINTENANCE }

public final class SystemConfig {
    public static final SystemMode SYSTEM_MODE;
    public static final boolean IS_DEBUG;
    public static final boolean IS_PERFORMANCE;
    public static final boolean IS_MAINTENANCE;

    static {
        String raw = System.getenv().getOrDefault("SYSTEM_MODE", "PERFORMANCE")
                         .toUpperCase().strip();
        SystemMode mode;
        try {
            mode = SystemMode.valueOf(raw);
        } catch (IllegalArgumentException e) {
            System.err.println("SYSTEM_MODE='" + raw + "' no es válido. Usando PERFORMANCE.");
            mode = SystemMode.PERFORMANCE;
        }
        SYSTEM_MODE    = mode;
        IS_DEBUG       = mode == SystemMode.DEBUG;
        IS_PERFORMANCE = mode == SystemMode.PERFORMANCE;
        IS_MAINTENANCE = mode == SystemMode.MAINTENANCE;
    }
    private SystemConfig() {}
}
```

```go
// Go — config/system.go
package config

import (
    "fmt"
    "os"
    "strings"
)

type SystemMode string

const (
    ModeDebug       SystemMode = "DEBUG"
    ModePerformance SystemMode = "PERFORMANCE"
    ModeMaintenance SystemMode = "MAINTENANCE"
)

var (
    Mode          SystemMode
    IsDebug       bool
    IsPerformance bool
    IsMaintenance bool
)

func init() {
    raw := strings.ToUpper(strings.TrimSpace(os.Getenv("SYSTEM_MODE")))
    switch SystemMode(raw) {
    case ModeDebug, ModePerformance, ModeMaintenance:
        Mode = SystemMode(raw)
    default:
        if raw != "" {
            fmt.Fprintf(os.Stderr, "SYSTEM_MODE='%s' no válido. Usando PERFORMANCE.\n", raw)
        }
        Mode = ModePerformance
    }
    IsDebug       = Mode == ModeDebug
    IsPerformance = Mode == ModePerformance
    IsMaintenance = Mode == ModeMaintenance
}
```

### 3.3 Uso del modo en cada función — patrón obligatorio

```python
# Ejemplo completo en Python — patrón que TODA función debe seguir
import logging
import time
from config import IS_DEBUG, IS_MAINTENANCE, SYSTEM_MODE
from maintenance import generate_maintenance_script  # ver sección 5

logger = logging.getLogger(__name__)

def procesar_pago(pago_id: str, monto: float, usuario_id: str) -> dict:
    """Procesa un pago. Comportamiento varía según SYSTEM_MODE."""

    # ── MODO DEBUG: entrada ────────────────────────────────────────────
    if IS_DEBUG:
        logger.debug(
            "ENTRADA procesar_pago | pago_id=%s | monto=%.2f | "
            "usuario_id=%s | modo=%s",
            pago_id, monto, usuario_id, SYSTEM_MODE.value
        )
        t_inicio = time.perf_counter()

    # ── MODO MANTENIMIENTO: interceptar escrituras ─────────────────────
    if IS_MAINTENANCE:
        script = generate_maintenance_script(
            modulo="pagos",
            operacion="procesar_pago",
            usuario_id=usuario_id,
            sql=f"""
                INSERT INTO pagos (id, monto, estado, procesado_en)
                VALUES ('{pago_id}', {monto}, 'PROCESADO', CURRENT_TIMESTAMP);

                UPDATE cuentas SET saldo = saldo - {monto}
                WHERE usuario_id = '{usuario_id}';
            """,
            rollback_sql=f"""
                DELETE FROM pagos WHERE id = '{pago_id}';
                UPDATE cuentas SET saldo = saldo + {monto}
                WHERE usuario_id = '{usuario_id}';
            """
        )
        logger.info(
            "MANTENIMIENTO: operación capturada en %s | pago_id=%s",
            script.nombre_archivo, pago_id
        )
        return {"estado": "PENDIENTE", "script": script.nombre_archivo}

    # ── LÓGICA PRINCIPAL (todos los modos excepto mantenimiento) ────────
    try:
        resultado = _ejecutar_pago(pago_id, monto, usuario_id)

        # ── MODO DEBUG: salida normal ──────────────────────────────────
        if IS_DEBUG:
            t_fin = time.perf_counter()
            logger.debug(
                "SALIDA procesar_pago OK | pago_id=%s | "
                "duracion_ms=%.2f | resultado=%s",
                pago_id, (t_fin - t_inicio) * 1000, resultado
            )
        return resultado

    except Exception as exc:
        # Los errores se loggean en TODOS los modos
        logger.error(
            "ERROR procesar_pago | pago_id=%s | error=%s",
            pago_id, str(exc), exc_info=IS_DEBUG  # stack trace solo en DEBUG
        )
        raise
```

---

## 4. Comportamiento de logging por modo — estándar

```
NIVEL DE LOG POR MODO:
  DEBUG:        DEBUG → INFO → WARNING → ERROR → CRITICAL  (todo)
  PERFORMANCE:  WARNING → ERROR → CRITICAL                  (solo problemas)
  MAINTENANCE:  INFO → WARNING → ERROR → CRITICAL           (operaciones + problemas)

FORMATO OBLIGATORIO DEL LOG (JSON estructurado — portable):
{
  "timestamp":      "2024-11-15T10:30:00.123Z",
  "nivel":          "DEBUG",
  "modo_sistema":   "DEBUG",
  "correlation_id": "a1b2c3d4-e5f6-...",
  "modulo":         "pagos.procesar_pago",
  "mensaje":        "ENTRADA procesar_pago",
  "parametros": {
    "pago_id":    "pay_abc123",
    "monto":      1500.00,
    "usuario_id": "usr_xyz789"
  },
  "duracion_ms":    null,
  "hilo":           "Thread-1",
  "servidor":       "api-server-01"
}

INFORMACIÓN MÍNIMA POR NIVEL:
  DEBUG:   timestamp + nivel + modo + correlation_id + módulo + mensaje + params + duración
  INFO:    timestamp + nivel + módulo + mensaje
  WARNING: timestamp + nivel + módulo + mensaje + contexto del problema
  ERROR:   timestamp + nivel + módulo + mensaje + stack_trace (si IS_DEBUG) + correlation_id
```

---

## 5. Módulo de mantenimiento — implementación

```python
# Python — maintenance.py
import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from config import SYSTEM_MODE

MAINTENANCE_PATH = Path(
    os.getenv("MAINTENANCE_OUTPUT_PATH", "/var/system/mantenimiento")
)

@dataclass
class MaintenanceScript:
    nombre_archivo: str
    ruta_completa: Path
    correlation_id: str

def generate_maintenance_script(
    modulo: str,
    operacion: str,
    usuario_id: str,
    sql: str,
    rollback_sql: str,
    correlation_id: str | None = None
) -> MaintenanceScript:
    """Genera un script SQL en el espacio de mantenimiento.
    Llamar SOLO cuando IS_MAINTENANCE es True."""

    correlation_id = correlation_id or str(uuid.uuid4())
    ahora = datetime.now(timezone.utc)
    timestamp = ahora.strftime("%Y%m%d_%H%M%S")
    nombre = f"{timestamp}_{modulo}_{operacion}.sql"
    ruta = MAINTENANCE_PATH / nombre

    MAINTENANCE_PATH.mkdir(parents=True, exist_ok=True)

    contenido = f"""-- ============================================================
-- SCRIPT DE MANTENIMIENTO
-- ============================================================
-- Generado:       {ahora.isoformat()}
-- Sistema:        {os.getenv('SYSTEM_NAME', 'sistema')} v{os.getenv('SYSTEM_VERSION', '?')}
-- Módulo:         {modulo}
-- Operación:      {operacion}
-- Usuario:        {usuario_id}
-- Correlation-ID: {correlation_id}
-- Modo:           MANTENIMIENTO
-- Revisado por:   [PENDIENTE DE FIRMA]
-- Aprobado por:   [PENDIENTE]
-- Aplicado en:    [PENDIENTE]
-- ============================================================

BEGIN;

{sql.strip()}

COMMIT;

-- ============================================================
-- ROLLBACK CORRESPONDIENTE (ejecutar si hay que revertir):
-- ============================================================
-- BEGIN;
-- {rollback_sql.strip().replace(chr(10), chr(10) + '-- ')}
-- COMMIT;
"""
    ruta.write_text(contenido, encoding="utf-8")
    return MaintenanceScript(
        nombre_archivo=nombre,
        ruta_completa=ruta,
        correlation_id=correlation_id
    )
```

---

## 6. Checklist de implementación — verificar antes de entregar

```
VARIABLES GLOBALES:
  □ SYSTEM_MODE definida como variable de entorno del sistema
  □ Tabla configuracion_sistema existe en BD con los 4 registros base
  □ El código lee SYSTEM_MODE UNA sola vez al inicio, no en cada llamada
  □ Valor fail-safe configurado: si no se define → PERFORMANCE

MODO DEBUG:
  □ Toda función relevante tiene logging de entrada y salida
  □ Todas las queries SQL se loggean con sus parámetros reales
  □ Los tiempos de ejecución se miden y loggean en ms
  □ Los stack traces completos se incluyen en errores
  □ Los datos sensibles (passwords, tokens, PII) están enmascarados en logs
  □ El correlation_id se propaga en todas las operaciones

MODO PERFORMANCE:
  □ El nivel de log es WARNING o superior (sin DEBUG ni INFO)
  □ El caché está activo con TTL configurado
  □ Todas las colecciones usan paginación o streaming
  □ Connection pool activo y configurado
  □ No hay loops con queries individuales (N+1 resuelto)
  □ Hay prueba de performance documentada que respalda las optimizaciones

MODO MANTENIMIENTO:
  □ Ningún INSERT/UPDATE/DELETE se ejecuta directamente en la BD
  □ El espacio de mantenimiento (directorio o tabla staging) existe
  □ Cada script incluye metadata completa (quién, cuándo, qué, rollback)
  □ El sistema retorna "operación pendiente" al usuario durante mantenimiento
  □ Los scripts se generan en orden cronológico con timestamp en el nombre
  □ Existe proceso documentado para revisar y aplicar los scripts

TODOS LOS MODOS:
  □ Los errores y excepciones se loggean en los 3 modos sin excepción
  □ Las validaciones de seguridad (auth/autorización) funcionan en los 3 modos
  □ Las pruebas cubren el comportamiento del código en los 3 modos
  □ La documentación del sistema describe cómo activar cada modo
```

---

## 7. Configuración en variables de entorno por entorno de despliegue

```
DESARROLLO LOCAL (.env.local):
  SYSTEM_MODE=DEBUG
  MAINTENANCE_OUTPUT_PATH=./mantenimiento
  SYSTEM_NAME=mi-sistema
  SYSTEM_VERSION=1.0.0-dev

INTEGRACIÓN / CI (.env.ci):
  SYSTEM_MODE=DEBUG
  MAINTENANCE_OUTPUT_PATH=/tmp/mantenimiento
  SYSTEM_NAME=mi-sistema
  SYSTEM_VERSION=1.0.0-ci

STAGING (.env.staging):
  SYSTEM_MODE=PERFORMANCE
  MAINTENANCE_OUTPUT_PATH=/var/sistema/mantenimiento
  SYSTEM_NAME=mi-sistema
  SYSTEM_VERSION=1.0.0-rc1

PRODUCCIÓN (.env.production):
  SYSTEM_MODE=PERFORMANCE
  MAINTENANCE_OUTPUT_PATH=/var/sistema/mantenimiento
  SYSTEM_NAME=mi-sistema
  SYSTEM_VERSION=1.0.0

VENTANA DE MANTENIMIENTO (temporal — cambiar y reiniciar):
  SYSTEM_MODE=MAINTENANCE
  MAINTENANCE_OUTPUT_PATH=/var/sistema/mantenimiento/YYYYMMDD
```

---

## 8. Restricciones

```
✗ No activar SYSTEM_MODE=DEBUG en producción con PII sin enmascarar
✗ No hardcodear el modo en el código fuente — siempre leer de variable de entorno
✗ No tener más de un modo activo simultáneamente
✗ No omitir el rollback en scripts de modo mantenimiento
✗ No aplicar scripts de mantenimiento sin revisión y firma del administrador
✗ No loggear contraseñas, tokens, números de tarjeta ni datos sensibles en ningún modo
✗ No omitir logging de errores en modo PERFORMANCE
✗ No sacrificar correctitud por velocidad en modo PERFORMANCE
✗ No ejecutar escrituras directas a BD cuando IS_MAINTENANCE es True
✗ No leer SYSTEM_MODE en cada llamada de función — leer una vez al inicio
```

---

## 9. Referencias del dominio (APA 7)

Fowler, M. (2018). *Refactoring: Improving the design of existing code*
    (2nd ed.). Addison-Wesley.
    [Patrones de configuración externa y feature flags]

Richardson, C. (2018). *Microservices patterns: With examples in Java*.
    Manning Publications.
    [Patrones de observabilidad: logging estructurado, correlation IDs]

Burns, B., Grant, B., Oppenheimer, D., Brewer, E., & Wilkes, J. (2016).
    Borg, Omega, and Kubernetes. *ACM Queue*, *14*(1), 70–93.
    https://doi.org/10.1145/2898442.2898444
    [Configuración de sistemas a escala]

The Twelve-Factor App. (2017). *The twelve-factor app methodology*.
    https://12factor.net/
    [Factor III: Configuración en el entorno; Factor XI: Logs]
