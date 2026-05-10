---
name: control-interno
description: >
  Activar cuando el usuario pida: diseñar, evaluar o mejorar controles internos
  de un proceso; mapear riesgos y controles de un área; evaluar la segregación de
  funciones; revisar el cumplimiento con COSO 2013, SOX u otros marcos de control;
  identificar deficiencias o debilidades de control; diseñar matrices de riesgos y
  controles (RCM); evaluar la efectividad operativa de controles existentes; o
  fortalecer el ambiente de control de una organización.
  Comandos de activación: /ci · [MODO: CONTROL INTERNO]
---

# SKILL — Control Interno

## 1. Verificaciones obligatorias ANTES de analizar

- [ ] **Proceso o área bajo análisis** — ¿ciclo de ingresos, compras, nómina, TI, financiero?
- [ ] **Objetivo del control** — ¿operacional / información financiera / cumplimiento / estratégico?
- [ ] **Marco de referencia** — ¿COSO 2013, COBIT, SOX, regulación específica del sector?
- [ ] **Fase** — ¿diseño del control o evaluación de efectividad operativa?
- [ ] **Tipo de organización** — ¿empresa pública (SOX), privada, gubernamental, ONG?
- [ ] **Controles existentes** — ¿hay documentación actual de controles o se parte de cero?

---

## 2. Los 5 componentes COSO — verificar cobertura

```
COMPONENTE 1 — ENTORNO DE CONTROL
  □ Integridad y valores éticos documentados y comunicados
  □ Competencia del personal definida para roles críticos
  □ Estructura organizacional con responsabilidades claras
  □ Compromiso y supervisión del consejo/alta dirección

COMPONENTE 2 — EVALUACIÓN DE RIESGOS
  □ Objetivos del proceso claramente definidos
  □ Riesgos identificados que amenazan esos objetivos
  □ Riesgos de fraude considerados explícitamente
  □ Consideración de cambios significativos en el entorno

COMPONENTE 3 — ACTIVIDADES DE CONTROL
  □ Controles seleccionados responden a los riesgos identificados
  □ Mix apropiado: preventivos + detectivos + correctivos
  □ Segregación de funciones implementada o compensada
  □ Controles de TI generales y de aplicación evaluados

COMPONENTE 4 — INFORMACIÓN Y COMUNICACIÓN
  □ Información relevante capturada y disponible oportunamente
  □ Comunicación interna efectiva sobre responsabilidades de control
  □ Comunicación con partes externas cuando aplica

COMPONENTE 5 — ACTIVIDADES DE MONITOREO
  □ Evaluaciones continuas y/o periódicas implementadas
  □ Deficiencias comunicadas a quienes corresponde y corregidas
  □ Indicadores de efectividad del control definidos
```

---

## 3. Estructura de la Matriz de Riesgos y Controles (RCM)

```
COLUMNAS OBLIGATORIAS DE LA RCM:
  1. ID del riesgo
  2. Descripción del riesgo (evento de riesgo específico)
  3. Aseveración afectada (para procesos financieros: existencia, integridad,
     valoración, presentación, corte)
  4. ID del control
  5. Descripción del control (quién hace qué, cuándo y cómo)
  6. Tipo de control: Preventivo / Detectivo / Correctivo / Directivo
  7. Naturaleza: Manual / Automatizado / Semi-automatizado
  8. Frecuencia: Diario / Semanal / Mensual / Trimestral / Anual / Ad hoc
  9. Evidencia esperada: qué documento o registro prueba que el control operó
  10. Responsable del control
  11. Efectividad del diseño: Efectivo / Con deficiencia / No efectivo
  12. Efectividad operativa: Efectivo / Con deficiencia / No probado
```

---

## 4. Formato de entrega obligatorio

```
## [PANORAMA]
Marco regulatorio y mejores prácticas actuales para este tipo de proceso/sector.
¿Cuáles son las deficiencias más comunes en este tipo de proceso?

## [MAPEO DEL PROCESO]
Flujo del proceso en pasos secuenciales (simplificado).
Identificación de puntos de decisión y de transferencia de responsabilidad.

## [RIESGOS DEL PROCESO]
Por cada objetivo del proceso: ¿qué puede salir mal?
Riesgos con su impacto potencial si se materializan.

## [CONTROLES RECOMENDADOS]
Por cada riesgo: control(es) que lo mitigan.

RCM resumida:
| Riesgo | Control | Tipo | Frecuencia | Evidencia | Responsable |
|--------|---------|------|-----------|-----------|-------------|
| ...    | ...     | Prev./Det./Cor. | ... | ... | ... |

## [SEGREGACIÓN DE FUNCIONES]
Incompatibilidades identificadas en el proceso.
¿Hay controles compensatorios si la segregación no es posible?

## [DEFICIENCIAS IDENTIFICADAS]  ← si se evalúa control existente
Nivel de severidad: Deficiencia / Deficiencia significativa / Debilidad material
Según PCAOB / SEC para efectos SOX, o criterio interno para otros marcos.

## [INDICADORES DE EFECTIVIDAD]
KCIs (Key Control Indicators) propuestos para monitoreo continuo.

## [REFERENCIAS]  — APA 7, más reciente → más antigua
```

---

## 5. Roles de usuario — control obligatorio en sistemas con acceso de usuarios

En todo análisis de control interno de un sistema con usuarios, verificar
que existen los 5 roles mínimos y que su implementación cumple con los
principios de segregación de funciones y mínimo privilegio.

```
OBJETIVOS DE CONTROL RELACIONADOS CON ROLES:

  EXISTENCIA DE LOS 5 ROLES BASE:
    □ ¿El sistema define los roles: administrador, operador, usuario,
      desarrollador y visualizador?
    □ ¿Los roles están documentados con sus capacidades y restricciones?
    □ ¿Existe un proceso formal de asignación y revocación de roles?

  SEGREGACIÓN DE FUNCIONES POR ROL:
    □ administrador: no debe también ser operador en sistemas financieros críticos
      (quien configura el sistema no debe ejecutar las operaciones)
    □ operador: no debe tener capacidades de administrador
      (quien ejecuta no debe poder alterar los controles)
    □ visualizador: no debe tener ninguna capacidad de escritura
      (si se detecta → deficiencia significativa)
    □ desarrollador: no debe acceder a datos de producción de negocio
      sin autorización explícita y auditada

  CONTROLES DE ACCESO MÍNIMOS:
    □ Autenticación requerida para todos los roles sin excepción
    □ MFA obligatorio para rol administrador
    □ Registro de auditoría de cada cambio de rol (quién, cuándo, quién aprobó)
    □ Revisión periódica de asignaciones de roles (mínimo trimestral)
    □ Proceso de baja inmediata de accesos al cesar la relación laboral

  RIESGOS A EVALUAR:
    Riesgo 1: usuario con más roles de los necesarios → acceso excesivo
    Riesgo 2: ausencia de alguno de los 5 roles → control incompleto
    Riesgo 3: visualizador con acceso de escritura → control inefectivo
    Riesgo 4: desarrollador con acceso a producción sin auditoría → riesgo de fraude
    Riesgo 5: sin proceso de revocación al cesar relación → acceso no autorizado
```

---

## 6. Clasificación de deficiencias

```
DEFICIENCIA SIMPLE
  El control tiene una falla pero existen controles compensatorios efectivos.
  Acción: Corregir en el ciclo normal de mejora continua.

DEFICIENCIA SIGNIFICATIVA
  La falla del control aumenta materialmente el riesgo de error o irregularidad.
  Acción: Comunicar a la alta dirección; plan de remediación prioritario.

DEBILIDAD MATERIAL
  Alta probabilidad de que cause un error o irregularidad material
  sin ser detectada oportunamente.
  Acción: Comunicar al Comité de Auditoría / Consejo; remediación inmediata.
```

---

## 7. Modos globales — controles de control interno por modo

Los 3 modos globales deben evaluarse como parte del sistema de control interno.
Cada modo tiene riesgos y controles propios que deben estar en la RCM.

```
OBJETIVOS DE CONTROL POR MODO:

MODO DEBUG:
  Riesgo: exposición de datos sensibles a través de logs detallados
  Control 1 (preventivo): los logs en modo DEBUG enmascaran PII y credentials
  Control 2 (detectivo):  revisión periódica de muestras de logs de DEBUG
  Control 3 (directivo):  política que restringe SYSTEM_MODE=DEBUG en producción
                          a ventanas autorizadas con registro de auditoría
  Evidencia esperada:     logs de DEBUG sin passwords ni tokens en claro

MODO PERFORMANCE:
  Riesgo: optimizaciones que omitan validaciones de control
  Control 1 (preventivo): lista explícita de validaciones que NUNCA se desactivan
  Control 2 (detectivo):  pruebas automáticas que verifican controles activos en
                          modo PERFORMANCE antes de cada despliegue
  Evidencia esperada:     resultado de pruebas de regresión en modo PERFORMANCE

MODO MANTENIMIENTO:
  Riesgo 1: scripts SQL no revisados aplicados en producción sin autorización
  Control 1 (preventivo): proceso formal de revisión y firma de scripts
  Control 2 (preventivo): solo el rol administrador puede aplicar scripts
  Control 3 (detectivo):  tabla mantenimiento_scripts con registro de quién
                          revisó, aprobó y aplicó cada script
  Control 4 (correctivo): rollback documentado en cada script
  Evidencia esperada:     tabla mantenimiento_scripts con firmas completas

  Riesgo 2: pérdida de scripts de mantenimiento generados
  Control 1 (preventivo): volumen persistente para el directorio de mantenimiento
  Control 2 (detectivo):  conciliación entre operaciones capturadas y scripts existentes
  Evidencia esperada:     inventario de scripts en tabla mantenimiento_scripts

CONTROL ADICIONAL — CAMBIO DE MODO:
  □ Todo cambio de SYSTEM_MODE debe registrarse:
      Quién cambió el modo / cuándo / de qué modo a qué modo / motivo
  □ Solo el rol administrador puede cambiar el modo en producción
  □ El cambio de modo debe generar alerta al equipo de operaciones
  □ SYSTEM_MODE=DEBUG en producción es una excepción que requiere
    aprobación documentada y debe revertirse en < 4 horas
```

---

## 8. Restricciones

```
✗ NUNCA recomendar un control que no tenga evidencia documentable
✗ NUNCA aceptar controles manuales de alto volumen sin evaluar automatización
✗ NUNCA dejar incompatibilidades de segregación sin control compensatorio
✗ NUNCA clasificar una deficiencia sin criterio explícito de severidad
✗ NUNCA evaluar efectividad operativa sin haber verificado efectividad del diseño primero
✗ NUNCA omitir el riesgo de fraude en el análisis de riesgos del proceso
```

---

## 9. Referencias del dominio (APA 7)

Committee of Sponsoring Organizations of the Treadway Commission. (2013).
    *Internal control — Integrated framework*. COSO.

ISACA. (2019). *COBIT 2019 framework: Governance and management objectives*.
    ISACA.

Public Company Accounting Oversight Board. (2007). *AS 2201: An audit of
    internal control over financial reporting that is integrated with an
    audit of financial statements*. PCAOB.
    https://pcaobus.org/Standards/Auditing/Pages/AS2201.aspx
