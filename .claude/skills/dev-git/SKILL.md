---
name: programador-git-flujo
description: >
  Activar cuando el usuario pida: definir o revisar una estrategia de branching;
  escribir o revisar mensajes de commit; resolver conflictos de merge o rebase;
  configurar hooks de pre-commit; diseñar un flujo de pull requests con criterios
  de revisión; limpiar el historial de un repositorio; configurar GitFlow, trunk-based
  development u otra estrategia; escribir descripciones de PR; o cualquier tarea
  donde el uso profesional de Git y el flujo de trabajo del equipo sea el objetivo.
  Comandos de activación: /dev-git · [MODO: GIT]
---

# SKILL — Flujo de trabajo con Git

## 1. Verificaciones obligatorias ANTES de recomendar

- [ ] **Tamaño del equipo** — ¿1 persona, 2-5, 5-15, >15?
- [ ] **Frecuencia de releases** — ¿varias veces al día, semanal, mensual?
- [ ] **CI/CD** — ¿hay pipeline automatizado? ¿qué dispara el deploy?
- [ ] **Estrategia actual** — ¿hay convenciones existentes que respetar?
- [ ] **Monorepo o multirepo** — afecta la estrategia de branching
- [ ] **Entornos** — ¿dev, staging, producción? ¿ramas por entorno?

---

## 2. Estrategias de branching — cuándo usar cada una

```
TRUNK-BASED DEVELOPMENT — RECOMENDADO para equipos con CI/CD maduro:
  ✓ Una sola rama principal (main/trunk)
  ✓ Feature branches de vida corta (< 2 días)
  ✓ Integración continua real: se hace merge varias veces al día
  ✓ Feature flags para código incompleto en producción
  Ideal para: equipos con CI/CD automatizado, releases frecuentes
  Requiere: cultura sólida de testing, feature flags, code review rápido

GITFLOW — para releases programados con versiones:
  Ramas: main, develop, feature/*, release/*, hotfix/*
  ✓ Estructura clara para versiones semánticas
  ✓ Permite mantener múltiples versiones en paralelo
  ✗ Historial complejo, integración tardía, merge conflicts frecuentes
  Ideal para: librerías, SDKs, software de versiones explícitas

GITHUB FLOW — simplificado para deploy continuo:
  Ramas: main + feature branches de corta vida
  ✓ Más simple que GitFlow
  ✓ Deploy desde main en cada merge
  Ideal para: equipos medianos con deploy continuo a producción

REGLA: Trunk-based development es la práctica recomendada por la investigación
       DORA (DORA Research, 2024) para alto rendimiento de entrega de software.
```

---

## 3. Commits — Conventional Commits (estándar obligatorio)

```
FORMATO:
  <tipo>[alcance opcional]: <descripción en imperativo, minúsculas>
  
  [cuerpo opcional]
  
  [footer opcional: BREAKING CHANGE, closes #issue]

TIPOS VÁLIDOS:
  feat:     Nueva funcionalidad para el usuario
  fix:      Corrección de bug
  docs:     Cambios solo en documentación
  style:    Formato, espacios, punto y coma (sin cambio de lógica)
  refactor: Refactorización sin nueva funcionalidad ni corrección de bug
  perf:     Mejora de rendimiento
  test:     Añadir o corregir pruebas
  build:    Cambios en el sistema de build o dependencias externas
  ci:       Cambios en archivos de configuración de CI/CD
  chore:    Otras tareas de mantenimiento
  revert:   Revertir un commit anterior

EJEMPLOS CORRECTOS:
  feat(auth): agregar autenticación con OAuth 2.0
  fix(cart): corregir cálculo de descuento cuando hay múltiples cupones
  refactor(users): extraer lógica de validación a servicio dedicado
  perf(search): agregar índice en columna email para reducir latencia
  docs(api): actualizar documentación del endpoint de pagos

EJEMPLOS INCORRECTOS:
  "fix stuff"                ← demasiado vago
  "WIP"                      ← no debe llegar a main
  "Updated files"            ← no describe qué ni por qué
  "feat: Added new feature"  ← no imperativo, mayúscula, sin alcance

BREAKING CHANGES:
  feat!: cambiar respuesta del endpoint de usuarios
  
  BREAKING CHANGE: el campo "nombre" fue renombrado a "full_name"
  en todos los endpoints de /users. Actualizar clientes que usen este campo.
```

---

## 4. Pull Requests — estructura y criterios de revisión

```
ESTRUCTURA DEL PR (template recomendado):

  ## ¿Qué hace este PR?
  Descripción concisa del cambio y su contexto de negocio.
  Por qué era necesario este cambio.

  ## Tipo de cambio
  - [ ] Nueva funcionalidad
  - [ ] Corrección de bug
  - [ ] Refactorización
  - [ ] Cambio de configuración / infraestructura

  ## Cómo probarlo
  Pasos exactos para verificar el cambio manualmente.
  Datos de prueba necesarios.

  ## Checklist del autor
  - [ ] Las pruebas pasan localmente
  - [ ] Se añadieron pruebas para el nuevo comportamiento
  - [ ] La documentación fue actualizada si aplica
  - [ ] No hay credenciales ni datos sensibles en el código
  - [ ] El código sigue las convenciones del proyecto

  ## Screenshots / evidencia  ← si hay cambios en UI
  Antes / Después

CRITERIOS DE REVISIÓN (para el revisor):
  □ ¿El código hace lo que el PR describe?
  □ ¿Hay casos edge no manejados?
  □ ¿Las pruebas son suficientes y correctas?
  □ ¿Hay problemas de seguridad (injection, auth, PII)?
  □ ¿El rendimiento es aceptable para el volumen esperado?
  □ ¿El código es legible y mantenible?
  □ ¿Los nombres de variables/funciones son claros?

TAMAÑO RECOMENDADO DE UN PR:
  Ideal:   < 400 líneas de cambio (más fácil de revisar bien)
  Máximo:  ~800 líneas (arriba de esto, dividir el PR)
  Señal:   Si el PR tarda más de 1 hora en revisarse → probablemente muy grande
```

---

## 5. Rebase vs. Merge — cuándo usar cada uno

```
MERGE (preserva la historia completa):
  git merge feature/login
  ✓ Historia exacta de cuándo ocurrió cada integración
  ✓ Más seguro — no reescribe historia
  ✗ Historial "sucio" con muchos merge commits en repos activos
  Usar: en ramas de larga vida (main ← release), hotfixes

REBASE (historia lineal):
  git rebase main
  ✓ Historial limpio y lineal, fácil de leer con git log
  ✓ git bisect funciona mejor
  ✗ Reescribe historia — peligroso en ramas compartidas
  Usar: feature branches ANTES de hacer merge a main (rebase local)
  NUNCA: hacer rebase de ramas que otros ya tienen en sus máquinas

SQUASH MERGE (un solo commit por PR):
  git merge --squash feature/login
  ✓ Historial muy limpio en main
  ✓ Fácil de revertir un PR completo con un solo revert
  ✗ Se pierde la historia granular del desarrollo
  Usar: cuando los commits del PR son WIP o no tienen valor histórico

REGLA DE ORO:
  "Nunca hagas rebase/force push en ramas que otras personas usan."
  Rebase es seguro solo en branches locales o personales.
```

---

## 6. Hooks de pre-commit — configuración recomendada

```
HOOKS RECOMENDADOS (usando pre-commit framework):

  .pre-commit-config.yaml:

  repos:
    # Formato de código
    - repo: https://github.com/psf/black          # Python
      hooks: [black]
    - repo: https://github.com/prettier/prettier   # JS/TS/CSS/JSON
      hooks: [prettier]

    # Linting
    - repo: https://github.com/pycqa/flake8        # Python
      hooks: [flake8]
    - repo: https://github.com/pre-commit/mirrors-eslint  # JS/TS
      hooks: [eslint]

    # Seguridad
    - repo: https://github.com/Yelp/detect-secrets
      hooks: [detect-secrets]                      # Detecta credenciales accidentales

    # Calidad general
    - repo: https://github.com/pre-commit/pre-commit-hooks
      hooks:
        - id: trailing-whitespace
        - id: end-of-file-fixer
        - id: check-yaml
        - id: check-json
        - id: check-merge-conflict
        - id: no-commit-to-branch
          args: ['--branch', 'main', '--branch', 'master']

REGLA: Los hooks de pre-commit deben ser rápidos (< 30 segundos).
       Si son lentos → los desarrolladores los desactivan.
       Las pruebas completas van en el CI, no en pre-commit.
```

---

## 7. Comandos Git esenciales para situaciones difíciles

```
DESHACER EL ÚLTIMO COMMIT (sin perder los cambios):
  git reset --soft HEAD~1

DESHACER CAMBIOS EN UN ARCHIVO (sin staging):
  git restore archivo.py

GUARDAR TRABAJO EN PROGRESO TEMPORALMENTE:
  git stash push -m "descripción del stash"
  git stash pop  (recuperar el más reciente)

ENCONTRAR CUÁNDO SE INTRODUJO UN BUG:
  git bisect start
  git bisect bad HEAD
  git bisect good v1.2.0  (último commit conocido como bueno)
  # Git va haciendo checkout de commits intermedios
  # En cada uno: git bisect good o git bisect bad
  git bisect reset  (al terminar)

LIMPIAR RAMAS LOCALES OBSOLETAS:
  git fetch --prune  (elimina referencias a ramas remotas borradas)
  git branch -vv | grep ': gone]' | awk '{print $1}' | xargs git branch -d

VER QUÉ CAMBIÓ EN UN ARCHIVO A LO LARGO DEL TIEMPO:
  git log --follow -p -- ruta/al/archivo.py

REVERTIR UN COMMIT ESPECÍFICO (sin reescribir historia):
  git revert <commit-hash>  (crea un nuevo commit que deshace el cambio)
```

---

## 8. .gitignore — reglas obligatorias

```
SIEMPRE IGNORAR:
  # Dependencias
  node_modules/
  __pycache__/
  .venv/
  vendor/

  # Builds y compilados
  dist/
  build/
  *.pyc
  *.class
  *.o

  # Configuración local y secretos
  .env
  .env.local
  .env.*.local
  *.pem
  *.key
  secrets.json

  # IDEs
  .idea/
  .vscode/
  *.swp
  .DS_Store

  # Cobertura y reportes
  coverage/
  .coverage
  *.lcov

NUNCA IGNORAR (errores comunes):
  ✗ .env.example  (debe estar en el repo como plantilla)
  ✗ Makefile o scripts de setup del proyecto
  ✗ docker-compose.yml base (sin credenciales)
```

---

## 9. Formato de entrega obligatorio

```
### [Estrategia recomendada]
Branching strategy elegida y justificación para el contexto del equipo.

### [Convenciones de commits]
Tipos de commit válidos y ejemplos para este proyecto.

### [Flujo de PR]
Template del PR y criterios de revisión definidos.

### [Configuración]
Archivos de configuración listos para usar:
  - .pre-commit-config.yaml
  - .gitignore (si aplica)
  - Plantilla de PR (PULL_REQUEST_TEMPLATE.md)

### [Comandos de referencia]
Comandos Git para las situaciones más frecuentes del proyecto.

### [Referencias]  ← APA 7, más reciente → más antigua
```

---

## 10. Restricciones

```
✗ No hacer force push (--force) en ramas compartidas o main
✗ No commitear credenciales, tokens o datos sensibles
✗ No usar commits genéricos como "fix", "update", "changes"
✗ No hacer merge a main sin revisión (proteger la rama en el repositorio)
✗ No mantener feature branches por más de 1 semana sin integrar
✗ No ignorar conflictos de merge — resolverlos con cuidado y verificar las pruebas
✗ No modificar el historial de ramas que otros ya tienen localmente
```

---

## 11. Referencias del dominio (APA 7)

DORA Research. (2024). *Accelerate: State of DevOps 2024*. Google Cloud.
    https://dora.dev/research/

Conventional Commits. (2023). *Conventional commits specification v1.0.0*.
    https://www.conventionalcommits.org/en/v1.0.0/

Chacon, S., & Straub, B. (2014). *Pro Git* (2nd ed.). Apress.
    https://git-scm.com/book/en/v2
