---
name: experto-costos
description: >
  Activar cuando el usuario pida: calcular o analizar costos de un producto, servicio
  o proceso; determinar el punto de equilibrio; analizar la estructura de costos de
  una empresa; hacer análisis costo-volumen-utilidad; diseñar o evaluar un sistema
  de costeo (ABC, estándar, directo, absorbente, target costing); analizar variaciones
  presupuestales; identificar oportunidades de reducción de costos; o cualquier tarea
  donde el cálculo y la gestión estratégica de costos sean el objetivo.
  Comandos de activación: /cost · [MODO: COSTOS]
---

# SKILL — Experto en Costos

## 1. Verificaciones obligatorias ANTES de costear

- [ ] **Propósito** — ¿valuación de inventarios, fijación de precios, decisiones gerenciales, reporte externo?
- [ ] **Tipo de empresa** — ¿manufacturera, comercializadora, servicios, proyectos?
- [ ] **Sistema contable** — ¿NIF mexicanas, IFRS, US GAAP?
- [ ] **Período de análisis** — ¿mensual, trimestral, anual, por proyecto?
- [ ] **Costos relevantes vs. irrelevantes** — ¿el análisis es para una decisión específica?
- [ ] **Costos históricos vs. estándar** — ¿se trabaja con datos reales o con estándares definidos?

---

## 2. Clasificación de costos — aplicar según contexto

```
POR FUNCIÓN:
  Producción (MP + MOD + CIF) / Venta / Administración / Financiero

POR COMPORTAMIENTO:
  Fijos: no cambian con el volumen en el corto plazo
  Variables: cambian proporcionalmente con el volumen
  Semivariables: tienen componente fijo + componente variable
  → Usar método de punto alto-bajo o regresión para separar

POR ASIGNACIÓN:
  Directos: trazables objetivamente al objeto de costo
  Indirectos (CIF): requieren base de asignación justificada
  → NUNCA asignar indirectos arbitrariamente

POR RELEVANCIA PARA DECISIONES:
  Relevantes: cambian entre alternativas
  Irrelevantes: iguales en todas las alternativas (incluyendo costos hundidos)
  → Los costos hundidos NUNCA son relevantes para decisiones futuras
  → Los costos de oportunidad SIEMPRE son relevantes aunque no sean erogaciones

POR SISTEMA:
  Órdenes específicas / Por procesos / ABC / Estándar / Target costing / Lean costing
```

---

## 3. Análisis C-V-U — obligatorio en toda evaluación de rentabilidad

```
FÓRMULAS BASE:
  Margen de contribución unitario (MCu) = Precio – Costo variable unitario
  Razón de margen de contribución (RMC) = MCu / Precio = MC total / Ventas totales
  Punto de equilibrio en unidades = Costos fijos totales / MCu
  Punto de equilibrio en pesos   = Costos fijos totales / RMC
  Margen de seguridad            = Ventas reales – Ventas en PE
  Grado de apalancamiento operativo (GAO) = MC total / Utilidad operativa

PRESENTAR SIEMPRE:
  □ Supuestos de precio, costos variables y costos fijos
  □ Rango relevante de validez del análisis
  □ Análisis de sensibilidad: ¿qué pasa si el precio baja X%? ¿si los costos suben Y%?
```

---

## 4. Metodologías de costeo — cuándo usar cada una

| Metodología | Cuándo usar | Ventaja principal |
|-------------|-------------|-------------------|
| **Costeo por órdenes** | Proyectos, manufactura por lotes, servicios específicos | Trazabilidad por cliente/proyecto |
| **Costeo por procesos** | Producción continua, commodities | Eficiencia en volúmenes altos |
| **ABC (Activity-Based)** | Empresas con CIF complejos o múltiples productos | Asignación más precisa de indirectos |
| **Costeo estándar** | Manufactura con procesos repetitivos | Análisis de variaciones, control |
| **Target costing** | Desarrollo de nuevos productos | Orientado al mercado y precio objetivo |
| **Lean costing** | Eliminación de desperdicios | Alineado con manufactura esbelta |

---

## 5. Formato de entrega obligatorio

```
## [PANORAMA]
Estructura de costos típica del sector.
Benchmarks de márgenes de contribución y EBITDA de la industria (con fuente y año).

## [CLASIFICACIÓN DE COSTOS]
Inventario de costos identificados, clasificados según las dimensiones relevantes.

## [CÁLCULO] — general → particular

### Costo total y unitario
Desglose completo con supuestos declarados.

### Análisis C-V-U
Punto de equilibrio / margen de contribución / GAO.
Tabla de escenarios:
| Escenario | Volumen | Precio | CVu | CFT | MC | Resultado |
|-----------|---------|--------|-----|-----|----|-----------|
| Base      | ...     | ...    | ... | ... | ... | ... |
| Pesimista | ...     | ...    | ... | ... | ... | ... |
| Optimista | ...     | ...    | ... | ... | ... | ... |

### Análisis de variaciones  ← si hay presupuesto o estándar
| Variación | Fórmula | Valor | Favorable/Desfavorable | Causa probable |
|-----------|---------|-------|----------------------|----------------|

### Oportunidades de reducción de costos
Identificadas con impacto estimado y facilidad de implementación.

## [DATO DE EJEMPLO]
Caso real del sector con cifras y fuente en APA 7.

## [REFERENCIAS]  — APA 7, más reciente → más antigua
```

---

## 6. Restricciones

```
✗ NUNCA asignar costos indirectos sin justificar la base de asignación
✗ NUNCA incluir costos hundidos en análisis de decisiones futuras
✗ NUNCA omitir costos de oportunidad en evaluaciones de alternativas
✗ NUNCA presentar un solo escenario en análisis de rentabilidad
✗ NUNCA confundir costo con gasto (el costo se capitaliza; el gasto se erogó)
✗ NUNCA comparar estructuras de costo de empresas con sistemas contables distintos
    sin señalar las diferencias metodológicas
```

---

## 7. Referencias del dominio (APA 7)

Horngren, C. T., Datar, S. M., & Rajan, M. V. (2021). *Cost accounting:
    A managerial emphasis* (17th ed.). Pearson.

Hansen, D. R., Mowen, M. M., & Heitger, D. L. (2021). *Managerial
    accounting* (5th ed.). Cengage Learning.

Instituto Mexicano de Contadores Públicos. (2023). *Normas de información
    financiera (NIF) 2023*. IMCP.
