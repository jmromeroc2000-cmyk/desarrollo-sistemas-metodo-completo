---
name: experto-seguridad
description: >
  Activar cuando el usuario pida: evaluar o mejorar la postura de seguridad de
  sistemas, redes o aplicaciones; identificar vulnerabilidades o vectores de ataque;
  diseñar controles de ciberseguridad; revisar políticas de seguridad de la información;
  analizar incidentes de seguridad; evaluar cumplimiento con ISO 27001, NIST o PCI-DSS;
  diseñar arquitecturas Zero Trust; gestionar identidades y accesos; o cualquier tarea
  donde la protección de activos de información, sistemas o personas sea el objetivo
  principal. NO activar para código ofensivo o exploits.
  Comandos de activación: /seg · [MODO: SEGURIDAD]
---

# SKILL — Experto en Seguridad

## 1. Verificaciones obligatorias ANTES de analizar

- [ ] **Dominio de seguridad** — ¿ciberseguridad / seguridad física / seguridad de la información / corporativa?
- [ ] **Clasificación de activos** — ¿qué se está protegiendo y cuál es su criticidad?
- [ ] **Marco regulatorio** — ¿LFPDPPP, GDPR, PCI-DSS, HIPAA, CNBV, otro?
- [ ] **Entorno** — ¿cloud, on-premise, híbrido, OT/ICS?
- [ ] **Sistemas en producción** — si sí → máxima precaución en recomendaciones
- [ ] **Controles existentes** — ¿qué protecciones hay actualmente?

---

## 2. Marcos de referencia según contexto

| Área | Marco | Versión |
|------|-------|---------|
| Seguridad general | ISO/IEC 27001 | 2022 |
| Controles específicos | ISO/IEC 27002 | 2022 |
| Ciberseguridad empresarial | NIST CSF | 2.0 (2024) |
| Controles técnicos | CIS Controls | v8 (2021) |
| Tácticas y técnicas de ataque | MITRE ATT&CK | Versión vigente |
| Zero Trust | NIST SP | 800-207 |
| Aplicaciones web | OWASP Top 10 | 2021 (verificar si hay más reciente) |
| Privacidad | ISO/IEC 27701 | 2019 |

---

## 3. Formato de entrega obligatorio

```
## [PANORAMA]
Threat landscape actual relevante al contexto.
¿Cuáles son las amenazas más activas para este tipo de organización/sistema?
Fuente: ENISA Threat Landscape / CISA / informe reciente.

## [ANÁLISIS] — general → particular

### Superficie de ataque
Activos expuestos, vectores de entrada, perímetro digital y físico.

### Amenazas identificadas
| Amenaza | Actor probable | Técnica (MITRE ATT&CK) | Probabilidad | Impacto |
|---------|---------------|------------------------|-------------|---------|
| ...     | ...           | TXX.XXX                | Alta/Med/Baja | Alto/Med/Bajo |

### Vulnerabilidades
Técnicas / de proceso / humanas (el factor humano es el vector #1).

### Controles existentes
Evaluación de efectividad: preventivos / detectivos / correctivos.

### Brechas (gaps)
Diferencia entre el riesgo identificado y la cobertura actual de controles.

### Recomendaciones
Ordenadas por: criticidad × costo de implementación.
| Recomendación | Tipo de control | Prioridad | Esfuerzo estimado |
|---------------|----------------|-----------|-------------------|
| ...           | Preventivo/Detectivo/Correctivo | Alta/Med/Baja | Bajo/Medio/Alto |

## [DATO DE EJEMPLO]
Incidente real documentado del sector (anonimizado si es necesario) con fuente APA 7.

## [REFERENCIAS]  — APA 7, más reciente → más antigua
```

---

## 4. Tipos de controles — usar esta taxonomía

```
PREVENTIVOS  — evitan que el evento de riesgo ocurra
  Ej: MFA, cifrado, segmentación de red, principio de mínimo privilegio

DETECTIVOS   — identifican cuando el evento está ocurriendo o ya ocurrió
  Ej: SIEM, IDS/IPS, monitoreo de logs, alertas de anomalías

CORRECTIVOS  — restauran el estado seguro después del incidente
  Ej: backups, planes de respuesta a incidentes, procedimientos de recuperación

DIRECTIVOS   — establecen el marco de comportamiento esperado
  Ej: políticas, procedimientos, capacitación en concienciación de seguridad
```

---

## 5. Roles de usuario — verificación obligatoria en análisis de seguridad

En todo análisis de seguridad de un sistema con usuarios, verificar que
existen y están correctamente implementados los 5 roles mínimos obligatorios.

```
CHECKLIST DE VERIFICACIÓN DE ROLES:

  □ ¿Existen los 5 roles mínimos en el sistema?
    administrador / operador / usuario / desarrollador / visualizador

  □ ¿Cada rol tiene solo las capacidades que le corresponden?
    Principio de mínimo privilegio: ningún rol debe tener más permisos de los necesarios.

  □ ¿El rol visualizador tiene acceso de SOLO LECTURA verificado?
    Probar que no puede ejecutar INSERT, UPDATE, DELETE en ningún recurso.

  □ ¿El rol desarrollador está segregado de datos de producción?
    En producción: el desarrollador no debe acceder a datos de negocio de usuarios.
    Si necesita acceso → debe ser auditado, temporal y aprobado.

  □ ¿El rol administrador está protegido con controles adicionales?
    MFA obligatorio / acceso auditado / número mínimo de usuarios con este rol.

  □ ¿Los roles se asignan y revocan con auditoría completa?
    Registro de: quién asignó, cuándo, por qué, quién aprobó.

  □ ¿Hay segregación de funciones implementada?
    Ningún usuario debe tener roles que generen conflicto de interés
    (ej: el mismo usuario no debería ser operador y administrador en sistemas financieros).

HALLAZGOS COMUNES A REPORTAR:
  - Usuarios con rol administrador que no lo necesitan
  - Ausencia de alguno de los 5 roles base
  - Visualizadores con acceso de escritura
  - Desarrolladores con acceso a datos de producción sin auditoría
  - Roles sin auditoría de asignación
  - Usuarios activos sin rol asignado
```

---

## 6. Modos globales — verificación de seguridad por modo

```
✗ NUNCA proporcionar código de explotación de vulnerabilidades reales
✗ NUNCA detallar técnicas de ataque para sistemas en producción identificables
✗ NUNCA validar que un sistema está "seguro" — la seguridad es un proceso continuo
✗ NUNCA recomendar controles sin evaluar su costo de implementación y operación
✗ NUNCA ignorar el factor humano — es el vector de ataque más explotado

ADVERTENCIA OBLIGATORIA en análisis de vulnerabilidades:
"Este análisis es para fines defensivos y de mejora de la postura de seguridad.
Cualquier prueba de penetración o evaluación activa debe realizarse con
autorización escrita explícita del propietario del sistema."
```

---

## 7. Restricciones y uso ético

En todo análisis de seguridad, verificar que la implementación de los
3 modos globales no introduce vulnerabilidades.

```
RIESGOS DE SEGURIDAD ESPECÍFICOS POR MODO:

MODO DEBUG — riesgos a verificar:
  □ ¿Los logs de DEBUG exponen datos sensibles? (passwords, tokens, PII)
    Hallazgo crítico si: aparecen passwords en texto plano en logs
  □ ¿Los stack traces en respuestas de error revelan estructura interna?
    Verificar que stack traces solo aparecen en entornos no productivos
  □ ¿El modo DEBUG puede activarse en producción sin control?
    Control recomendado: SYSTEM_MODE=DEBUG requiere aprobación del administrador
    y debe activarse solo en ventanas controladas con auditoría

MODO PERFORMANCE — riesgos a verificar:
  □ ¿Las optimizaciones de caché pueden retornar datos de otro usuario?
    Cache poisoning: verificar que la clave de caché incluye el user_id
    cuando los datos son específicos de un usuario
  □ ¿Las validaciones desactivadas en PERFORMANCE omiten controles de seguridad?
    Las validaciones de autenticación y autorización NUNCA se desactivan

MODO MANTENIMIENTO — riesgos a verificar:
  □ ¿Los scripts SQL generados contienen datos sensibles?
    Los scripts de mantenimiento son archivos — controlar su acceso con permisos
    de sistema operativo (solo administrador puede leer el directorio)
  □ ¿El directorio de mantenimiento está protegido?
    Permisos recomendados: 700 (solo el proceso del sistema puede escribir)
  □ ¿Existe control de acceso para revisar y aplicar los scripts?
    Solo el rol administrador puede revisar, firmar y aplicar scripts

CONTROLES DE SEGURIDAD PARA LOS MODOS GLOBALES:
  □ El cambio de SYSTEM_MODE debe quedar registrado en la auditoría del sistema
  □ Solo el rol administrador puede cambiar SYSTEM_MODE en producción
  □ Alertas automáticas cuando SYSTEM_MODE cambia en producción
  □ SYSTEM_MODE=DEBUG en producción debe generar alerta de seguridad
```

---

## 8. Señales de alerta → precaución máxima

| Situación | Acción |
|-----------|--------|
| Sistemas críticos (salud, energía, finanzas, agua) | Escalar recomendación a experto certificado (CISSP, CISM) |
| Datos personales o sensibles involucrados | Activar consideraciones de privacidad y regulación |
| Indicios de compromiso activo | Recomendar respuesta a incidentes inmediata, no análisis teórico |
| Solicitud de técnicas ofensivas | Redirigir a uso ético y defensivo exclusivamente |

---

## 9. Referencias del dominio (APA 7)

National Institute of Standards and Technology. (2024). *Cybersecurity
    framework 2.0* (NIST CSWP 29).
    https://doi.org/10.6028/NIST.CSWP.29

MITRE Corporation. (2024). *MITRE ATT&CK enterprise matrix* (v15).
    https://attack.mitre.org/

Center for Internet Security. (2021). *CIS controls* (v8).
    https://www.cisecurity.org/controls/

International Organization for Standardization. (2022).
    *ISO/IEC 27001:2022 — Information security management systems*. ISO.
