# Skills de Claude Code — Índice completo

Este directorio contiene los **35 skills** (22 originales + 13 nuevos del método)
que extienden el comportamiento definido en `CLAUDE.md`.

Los **13 skills nuevos** habilitan el **Método Completo de Desarrollo de
Sistemas dirigido por Metadata** (CLAUDE.md §14-17). Listado al final.

## Cómo activar un skill

**Opción 1 — Automática:** Claude detecta la situación y carga el skill por su `description`.

**Opción 2 — Explícita en el prompt:**
```
Lee .claude/skills/fin/SKILL.md y analiza este estado de resultados.
```

**Opción 3 — Con comando de modo** (definido en CLAUDE.md):
```
/fin Analiza la rentabilidad de esta empresa manufacturera.
```

---

## Directorio de skills

### Skills de programación (8)

| Comando | Carpeta | Dominio |
|---------|---------|---------|
| `/dev` | `skills/dev/` | Programador / Diseñador de sistemas — arquitectura, concurrencia, performance |
| `/dev-modes` | `skills/dev-modes/` | Modos globales — DEBUG, PERFORMANCE, MAINTENANCE (skill maestro) |
| `/dev-test` | `skills/dev-test/` | Pruebas unitarias e integración — pytest, Jest, JUnit, TDD, mocking |
| `/dev-api` | `skills/dev-api/` | Diseño de APIs REST y GraphQL — OpenAPI, versionado, seguridad |
| `/dev-db` | `skills/dev-db/` | Bases de datos — SQL-92, modelado, índices, N+1, transacciones |
| `/dev-git` | `skills/dev-git/` | Flujo Git — branching, Conventional Commits, PR, hooks |
| `/dev-docker` | `skills/dev-docker/` | Contenedores — Dockerfile, multi-stage, Compose, secrets |
| `/dev-clean` | `skills/dev-clean/` | Código limpio — SOLID, code smells, refactorización, complejidad |

### Skills de dominio (13)

| Comando | Carpeta | Dominio |
|---------|---------|---------|
| `/edu` | `skills/edu/` | Capacitador — Aprendizaje Significativo y Competencias |
| `/inv` | `skills/inv/` | Investigador riguroso |
| `/fin` | `skills/fin/` | Experto en Finanzas |
| `/mkt` | `skills/mkt/` | Experto en Marketing |
| `/tec` | `skills/tec/` | Experto en Tecnología |
| `/proy` | `skills/proy/` | Evaluador de Proyectos |
| `/seg` | `skills/seg/` | Experto en Seguridad |
| `/rsk` | `skills/rsk/` | Evaluador de Riesgos |
| `/ci` | `skills/ci/` | Control Interno |
| `/aud` | `skills/aud/` | Auditor profesional |
| `/dis` | `skills/dis/` | Diseñador estratégico |
| `/cost` | `skills/cost/` | Experto en Costos |
| `/tra` | `skills/tra/` | Traductor profesional |

---

## Estructura de cada SKILL.md

```
---
name:         identificador único del skill
description:  cuándo activarlo — Claude lo lee para decidir automáticamente
---

1. Verificaciones antes de responder   ← checklist de contexto requerido
2. Protocolo / marcos de referencia    ← cómo trabajar en este dominio
3. Formato de entrega obligatorio      ← estructura exacta de la respuesta
4. Restricciones                       ← qué nunca hacer en este modo
5. Señales de alerta                   ← cuándo aplicar precaución adicional
6. Advertencias obligatorias           ← textos legales o de responsabilidad
7. Referencias del dominio (APA 7)     ← fuentes base del skill
```

---

## Principios que aplican a todos los skills

Heredados del `CLAUDE.md` — no se repiten en cada skill pero siempre aplican:

- **APA 7ª edición** en todas las referencias y citas
- **Más reciente → más antigua** en el orden de las referencias
- **General → particular** en la estructura de toda respuesta
- **Protocolo de calidad de 4 pasos** antes de cada respuesta
- **Marcadores de certeza** `[DOCUMENTADO]` `[ESTIMADO]` `[VERIFICAR]` cuando corresponda

---

## Skills del método de fases (13 nuevos — v3.0 Método Completo)

Skills exclusivos del Método Completo de Desarrollo de Sistemas dirigido
por Metadata. Cada uno corresponde a una fase específica del método
(ver `CLAUDE.md` §14-17).

### Fase 0 — Bootstrap

| Comando | Carpeta | Propósito |
|---------|---------|-----------|
| `/init-proyecto` | `skills/init-proyecto/` | Copia las 11 migraciones bootstrap, `.claude/`, scripts y CLAUDE.md base preconfigurado |

### Fase 1 — Metadata

| Comando | Carpeta | Propósito |
|---------|---------|-----------|
| `/meta-add-tabla` | `skills/meta-add-tabla/` | Wizard que genera migración SQL completa para una tabla nueva con sus inserts en `tablas_sistema` y `campos_sistema` |
| `/meta-validate` | `skills/meta-validate/` | 17 checks de cobertura BD; reporta gaps con archivo:línea |
| `/meta-bump` | `skills/meta-bump/` | Sube versión SemVer en `metadata_versiones` (PATCH/MINOR/MAJOR) |
| `/meta-derive` | `skills/meta-derive/` | Para sistemas legacy: deriva entradas en metadata desde `information_schema` |

### Fase 2 — Arquitectura

| Comando | Carpeta | Propósito |
|---------|---------|-----------|
| `/arq-derive` | `skills/arq-derive/` | Propone arquitectura (capas, módulos, decisiones) leyendo SOLO la metadata vigente |

### Fase 3 — Stack

| Comando | Carpeta | Propósito |
|---------|---------|-----------|
| `/stack-pick` | `skills/stack-pick/` | Sugiere componentes según patrones detectados en metadata; pobla `componentes_sistema` |

### Fase 4 — Instalación

| Comando | Carpeta | Propósito |
|---------|---------|-----------|
| `/install-from-stack` | `skills/install-from-stack/` | Genera `package.json` + `.env.example` + `install.sh` derivados de `componentes_sistema` |

### Fase 5 — Programación

| Comando | Carpeta | Propósito |
|---------|---------|-----------|
| `/back-scaffold-from-meta` | `skills/back-scaffold-from-meta/` | Genera 4 archivos backend (`queries`/`service`/`controller`/`routes`) leyendo `campos_sistema` |
| `/front-scaffold-from-meta` | `skills/front-scaffold-from-meta/` | Genera lista + form + detalle frontend con controles según `formato_despliegue` |
| `/obs-init` | `skills/obs-init/` | Inicializa observabilidad desde `semaforos_sistema` + `procesos_sistema` (+ `metricas_definidas` si nivel 9) |

### QA — Cross-fase

| Comando | Carpeta | Propósito |
|---------|---------|-----------|
| `/audit-pendientes` | `skills/audit-pendientes/` | Lanza 2 agents en paralelo (docs + backend); plan priorizado ALTA/MEDIA/BAJA |
| `/cobertura-end-to-end` | `skills/cobertura-end-to-end/` | Verifica que cada tabla tenga backend + tests + UI + docs |

---

*Skills v4.0 — 35 skills totales*
*22 originales (8 programación + 14 dominio) + 13 del método de fases*
*Proyecto: Método Completo de Desarrollo de Sistemas dirigido por Metadata*
*Mayo 2026*
