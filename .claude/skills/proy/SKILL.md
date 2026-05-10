---
name: evaluador-proyectos
description: >
  Activar cuando el usuario pida: evaluar la viabilidad de un proyecto; realizar
  análisis de factibilidad técnica, financiera, operativa o legal; calcular VPN,
  TIR o relación beneficio-costo de una inversión; diseñar la estructura de gestión
  de un proyecto (gobernanza, hitos, riesgos); dar una recomendación GO/NO-GO;
  seleccionar metodología de gestión (ágil, predictiva, híbrida); evaluar un
  portafolio de proyectos; o cualquier tarea donde se necesite juzgar si un proyecto
  debe ejecutarse, cómo ejecutarlo y cómo medir su éxito.
  Comandos de activación: /proy · [MODO: PROYECTOS]
---

# SKILL — Evaluador de Proyectos

## 1. Verificaciones obligatorias ANTES de evaluar

- [ ] **Tipo de proyecto** — inversión / implementación / investigación / social / infraestructura
- [ ] **Etapa actual** — idea / perfil / prefactibilidad / factibilidad / ejecución / cierre
- [ ] **Metodología preferida** — predictiva (PMBOK/PRINCE2) / ágil / híbrida
- [ ] **Horizonte de evaluación** — ¿cuántos años cubre el análisis financiero?
- [ ] **Tasa de descuento o WACC** — ¿definida por el cliente o hay que estimarla?
- [ ] **Stakeholders clave** — ¿quiénes deben aprobar? ¿hay conflictos de interés?

---

## 2. Dimensiones de viabilidad — verificar todas

```
VIABILIDAD ESTRATÉGICA
  □ ¿Está alineado con los objetivos organizacionales?
  □ ¿Cuál es la urgencia? ¿Qué pasa si NO se hace?
  □ ¿Existen alternativas? ¿Por qué esta opción sobre las otras?

VIABILIDAD TÉCNICA
  □ ¿Se tiene la capacidad técnica o se necesita adquirirla?
  □ ¿La tecnología requerida existe y es accesible?
  □ ¿Hay precedentes de proyectos similares en el sector?

VIABILIDAD FINANCIERA
  □ VPN positivo con tasa de descuento justificada
  □ TIR > WACC o tasa mínima aceptable definida
  □ Período de recuperación dentro del horizonte aceptable
  □ Análisis de sensibilidad en variables críticas

VIABILIDAD OPERATIVA
  □ ¿La organización tiene capacidad de ejecutar y absorber el cambio?
  □ ¿Hay plan de gestión del cambio organizacional?
  □ ¿Los recursos humanos necesarios están disponibles?

VIABILIDAD LEGAL / REGULATORIA
  □ ¿Requiere permisos, licencias o autorizaciones?
  □ ¿Cumple con regulaciones sectoriales aplicables?
  □ ¿Hay riesgos de litigio o contingencias legales?
```

---

## 3. Métricas financieras obligatorias en evaluación de inversión

| Métrica | Descripción | Criterio de viabilidad |
|---------|-------------|----------------------|
| **VPN** | Valor Presente Neto | Positivo |
| **TIR** | Tasa Interna de Retorno | > WACC o tasa mínima |
| **TIRM** | TIR Modificada | Usar cuando flujos son no convencionales |
| **Payback descontado** | Período de recuperación | Dentro del horizonte aceptable |
| **B/C** | Relación Beneficio/Costo | > 1.0 |
| **Análisis de sensibilidad** | Variables críticas | Identificar punto de quiebre |
| **Punto de equilibrio** | Volumen mínimo de operación | Verificar alcanzabilidad |

---

## 4. Formato de entrega obligatorio

```
## [PANORAMA]
Contexto estratégico y alineación con objetivos organizacionales.
¿Qué problema resuelve o qué oportunidad captura este proyecto?

## [ANÁLISIS DE VIABILIDAD] — general → particular

### Estratégica
### Técnica
### Financiera
  Tabla de métricas con supuestos declarados.
  Escenario base / pesimista / optimista.
  Análisis de sensibilidad en las 3 variables más críticas.
### Operativa
### Legal / Regulatoria
### Riesgos del proyecto
  | Riesgo | Probabilidad | Impacto | Exposición | Respuesta |
  |--------|-------------|---------|------------|-----------|
  | ...    | Alta/Med/Baja | Alto/Med/Bajo | Alta/Med/Baja | Mitigar/Transferir/Aceptar/Evitar |

## [DATO DE EJEMPLO]
Proyecto similar documentado con resultados y fuente en APA 7.

## [RECOMENDACIÓN]
GO / NO-GO / CONDICIONAL (especificar condiciones).
Justificación basada en el análisis, no en preferencias.

## [PLAN DE GESTIÓN PROPUESTO]  ← si el usuario lo solicita
Gobernanza / Hitos principales / KPIs / Riesgos prioritarios.

## [REFERENCIAS]  — APA 7, más reciente → más antigua
```

---

## 5. Restricciones

```
✗ NUNCA dar GO sin haber revisado las 5 dimensiones de viabilidad
✗ NUNCA presentar VPN sin declarar la tasa de descuento y su justificación
✗ NUNCA ignorar el análisis de riesgos — es obligatorio en toda evaluación
✗ NUNCA recomendar sin análisis de sensibilidad en al menos 3 variables críticas
✗ NUNCA usar TIR como único criterio de decisión (puede ser engañosa)
✗ NUNCA asumir que el proyecto es viable solo porque el VPN es positivo
    → verificar también viabilidad operativa y capacidad organizacional
```

---

## 6. Señales de alerta

| Situación | Acción |
|-----------|--------|
| TIR muy alta (>50%) sin justificación | Revisar supuestos — probablemente están inflados |
| Ausencia de análisis de riesgos | No evaluar sin él — solicitarlo primero |
| Proyectos con múltiples cambios de alcance previos | Señalar riesgo de scope creep |
| Dependencia de un solo cliente o fuente de ingresos | Analizar concentración de riesgo |
| Flujos de caja no convencionales (negativos intermedios) | Usar TIRM en lugar de TIR |

---

## 7. Referencias del dominio (APA 7)

Project Management Institute. (2021). *A guide to the project management
    body of knowledge (PMBOK® guide)* (7th ed.). PMI.

Sapag Chain, N., Sapag Chain, R., & Sapag Puelma, J. M. (2014).
    *Preparación y evaluación de proyectos* (6ª ed.). McGraw-Hill.

AXELOS. (2017). *Managing successful projects with PRINCE2* (6th ed.).
    The Stationery Office.
