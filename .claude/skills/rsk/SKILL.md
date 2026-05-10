---
name: evaluador-riesgos
description: >
  Activar cuando el usuario pida: identificar, evaluar o priorizar riesgos de
  cualquier tipo (estratégicos, operativos, financieros, de cumplimiento, reputacionales);
  construir o actualizar una matriz de riesgos; calcular exposición al riesgo;
  diseñar estrategias de tratamiento (mitigar, transferir, evitar, aceptar);
  definir KRIs (indicadores clave de riesgo); o evaluar la madurez del sistema de
  gestión de riesgos de una organización. Marco base: ISO 31000:2018 y COSO ERM 2017.
  Comandos de activación: /rsk · [MODO: RIESGOS]
---

# SKILL — Evaluador de Riesgos

## 1. Verificaciones obligatorias ANTES de evaluar

- [ ] **Tipo de riesgo** — estratégico / operativo / financiero / cumplimiento / reputacional / emergente
- [ ] **Horizonte temporal** — ¿análisis de corto (1 año), mediano (3 años) o largo plazo?
- [ ] **Apetito al riesgo** — ¿la organización lo tiene definido? ¿cuál es la tolerancia?
- [ ] **Riesgos inherentes vs. residuales** — ¿se evalúa antes o después de controles?
- [ ] **Metodología** — ¿cualitativa (matriz), semi-cuantitativa (scoring) o cuantitativa (VaR, Monte Carlo)?
- [ ] **Contexto regulatorio** — ¿hay requisitos normativos de gestión de riesgos aplicables?

---

## 2. Taxonomía de riesgos — usar como punto de partida

```
RIESGOS ESTRATÉGICOS
  Cambios en el entorno competitivo / disrupciones tecnológicas / cambios regulatorios
  / pérdida de clientes clave / fusiones y adquisiciones / reputación

RIESGOS OPERATIVOS
  Fallas de procesos / errores humanos / fallas de sistemas / fraude interno
  / proveedores críticos / continuidad del negocio

RIESGOS FINANCIEROS
  Liquidez / crédito / mercado (tipo de cambio, tasas, precios) / concentración

RIESGOS DE CUMPLIMIENTO
  Incumplimiento regulatorio / sanciones / litigios / cambios normativos

RIESGOS EMERGENTES (priorizar fuentes de los últimos 12 meses)
  IA y automatización / riesgos climáticos / ciberamenazas avanzadas / geopolítica
```

---

## 3. Metodología de evaluación — declarar cuál se usa

```
CUALITATIVA (matriz 5×5 o 3×3):
  Probabilidad:  Muy baja / Baja / Media / Alta / Muy alta
  Impacto:       Insignificante / Menor / Moderado / Mayor / Catastrófico
  Exposición:    Probabilidad × Impacto → mapa de calor
  Uso: orientación inicial, comunicación ejecutiva

SEMI-CUANTITATIVA (scoring ponderado):
  Asignar puntajes numéricos con escalas definidas y justificadas
  Uso: comparación entre riesgos, priorización de portafolio

CUANTITATIVA:
  VaR (Value at Risk): pérdida máxima esperada a cierto nivel de confianza
  CVaR / Expected Shortfall: pérdida esperada más allá del VaR
  Simulación de Monte Carlo: distribución de escenarios posibles
  Análisis de escenarios: impacto de eventos específicos
  Uso: riesgos financieros, seguros, decisiones de capital
```

---

## 4. Formato de entrega obligatorio

```
## [PANORAMA]
Contexto de riesgo: entorno sectorial, condiciones macroeconómicas,
principales amenazas emergentes relevantes al caso.

## [UNIVERSO DE RIESGOS]
Categorías aplicables al contexto del usuario.
Fuente: taxonomía ISO 31000 / COSO ERM / sectorial.

## [EVALUACIÓN] — por cada riesgo identificado

Tabla de evaluación:
| ID | Riesgo | Categoría | Probabilidad | Impacto | Exposición | Controles actuales | Riesgo residual |
|----|--------|-----------|-------------|---------|------------|-------------------|-----------------|
| R01 | [descripción del evento de riesgo] | Operativo | Alta | Mayor | Alta | [controles] | Media |

Mapa de calor:
  [representación ASCII o descripción de la distribución de riesgos]

## [RIESGOS PRIORITARIOS]
Top 5-10 por nivel de exposición, con descripción del escenario de materialización.

## [TRATAMIENTO RECOMENDADO]
| Riesgo | Estrategia | Acción específica | Responsable | Plazo | KRI propuesto |
|--------|-----------|-------------------|-------------|-------|---------------|
| R01 | Mitigar | [acción concreta] | [rol] | [plazo] | [indicador] |

## [KRIs RECOMENDADOS]
Indicadores clave de riesgo para monitoreo continuo.
Cada KRI con: valor actual / umbral de alerta / umbral de acción.

## [DATO DE EJEMPLO]
Materialización de riesgo similar en el sector con fuente APA 7.

## [REFERENCIAS]  — APA 7, más reciente → más antigua
```

---

## 5. Restricciones

```
✗ NUNCA evaluar riesgos correlacionados de forma independiente
✗ NUNCA ignorar riesgos de cola (baja probabilidad, impacto catastrófico)
✗ NUNCA presentar solo el escenario base — siempre incluir escenario adverso
✗ NUNCA usar puntajes de probabilidad e impacto sin definir las escalas
✗ NUNCA recomendar "aceptar" un riesgo sin que el usuario lo apruebe explícitamente
✗ NUNCA omitir riesgos emergentes en el contexto actual (IA, clima, geopolítica)
```

---

## 6. Referencias del dominio (APA 7)

Committee of Sponsoring Organizations of the Treadway Commission. (2017).
    *Enterprise risk management: Integrating with strategy and performance*.
    COSO.

International Organization for Standardization. (2018).
    *ISO 31000:2018 — Risk management: Guidelines*. ISO.

Basel Committee on Banking Supervision. (2023). *Principles for operational
    resilience*. Bank for International Settlements.
    https://www.bis.org/bcbs/publ/d532.htm
