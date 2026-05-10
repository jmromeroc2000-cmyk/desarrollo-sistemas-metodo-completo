# Desarrollo de Sistemas — Método Completo

Método de creación de sistemas en **5 fases** dirigido por **metadata**.
La metadata se diseña antes de programar y es el contrato que backend y
frontend leen — nunca duplican.

## ¿Qué hay aquí?

```
DesarrolloSistemasMetodoCompleto/
├── CLAUDE.md                  ← v3.0 — método completo (17 modos · 5 fases · 9 niveles · 4 versiones)
└── .claude/
    ├── settings.local.json
    ├── agents/
    │   └── ui-reviewer.md
    └── skills/
        ├── README.md          ← catálogo de los 35 skills
        └── (35 skills/)       ← 22 originales + 13 del método
```

## Las 5 fases

```
FASE 1 — METADATA           /meta   → diseñar tablas, campos, procesos en BD antes de programar
FASE 2 — ARQUITECTURA       /arq    → derivar capas y decisiones desde la metadata
FASE 3 — STACK              /dev    → declarar componentes_sistema con versiones
FASE 4 — INSTALACIÓN        /dev    → bootstrap del entorno desde el stack
FASE 5 — PROGRAMACIÓN       /dev    → backend y frontend en paralelo, ambos leyendo metadata
```

## Las 4 versiones (acumulativas)

| Versión | Niveles incluidos | Capacidad |
|---------|-------------------|-----------|
| V1 | 1 + 2 | Estructural + operacional (mínimo viable) |
| V2 | + 3 + 4 | + Capas administrativas + resiliencia |
| V3 | + 5 + 6 + 7 | + Esquemas BD + cache + históricos |
| V4 | + 8 + 9 | + CDN/edge + observabilidad avanzada |

## Cómo usar este método en un proyecto nuevo

```bash
# 1. Copiar la base
cp -R DesarrolloSistemasMetodoCompleto/* nuevo-proyecto/
cp -R DesarrolloSistemasMetodoCompleto/.claude nuevo-proyecto/

# 2. Iniciar Claude Code en el nuevo proyecto
cd nuevo-proyecto/
claude

# 3. Dentro de Claude:
/init-proyecto       # bootstrap: 11 migraciones + estructura
/meta                # diseña la metadata del dominio
/meta-validate       # verifica cobertura 100%
/arq-derive          # propone arquitectura
/stack-pick          # elige stack
/install-from-stack  # instala
/back-scaffold-from-meta + /front-scaffold-from-meta
```

Detalle completo del método y manual de uso con ejemplos de prompts en
[`CLAUDE.md`](./CLAUDE.md) §14-17.

## Origen

Método extraído del proyecto SistemaINV (sistema de inventarios) tras
desarrollarlo a través de 11 migraciones que establecieron progresivamente
la convención de metadata vigente (v1.1).

Tag inicial: `v1.0.0` — método V1 listo para reuso.
