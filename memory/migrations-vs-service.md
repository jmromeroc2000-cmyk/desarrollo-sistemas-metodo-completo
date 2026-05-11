---
name: Migración va PRIMERO en el commit, nunca después del service
description: Si el commit contiene service modificado pero la migración asociada está untracked, CI puede pasar verde por casualidad. Pre-commit hook orphan-migration-check lo bloquea.
type: project
---

Regla no negociable: si un cambio de backend requiere una nueva columna,
trigger o tabla, **la migración va en el MISMO commit que el service que la
usa**, nunca en un commit separado posterior.

**Why:** Caso real (sesión v1.4.8 → v1.4.9 de SistemaINV):

1. Aplico mig 016 a mi BD local (extiende trigger).
2. Modifico service.js para usar `SET LOCAL app.audit_motivo` antes del UPDATE.
3. Olvido `git add migrations/016_*.sql`.
4. Commit solo trae service.js modificado.
5. CI pasa verde porque su BD test recibe `npm run migrate` que lee TODOS
   los archivos en disco — incluyendo 016 (que está en disco pero untracked).
6. Si otro agente hace `git clone fresh` + `npm run migrate`, NO obtiene
   016 (no está en git) → service.js falla en runtime porque el trigger
   no captura `motivo`.

**Síntoma del bug:** "Funciona local, pasa CI, falla producción".

**How to apply:**

1. Mecánicamente bloqueado por `.husky/pre-commit` → corre
   `scripts/orphan-migration-check.sh`. Si detecta `migrations/*.sql` untracked
   + `src/**` staged, aborta con mensaje claro.

2. Si necesitas commitear el service ANTES de la migración (caso raro):
   - Hacer la migración primero y commitearla sola.
   - Mergear esa PR.
   - Pull y luego empezar la PR del service.

3. Si el cambio es MUY grande, dividir en dos PRs SECUENCIALES:
   - PR 1: solo migración (schema/trigger nuevo)
   - PR 2: usa la migración (service + tests)
   Mergear en orden, no en paralelo.

**Comportamiento prohibido:**
- ✗ `git commit src/modules/X/service.js` con `migrations/NNN_*.sql` untracked.
- ✗ `git commit --no-verify` para bypassar el hook (deja huella en log).
- ✗ Asumir "el CI verde es suficiente garantía" — el CI verde puede ser
  por casualidad si la migración existe en disco aunque no en git.
