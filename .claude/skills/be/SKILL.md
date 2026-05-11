---
name: programador-backend-be
description: >
  Activar cuando el usuario pida: crear/modificar endpoints, migraciones SQL,
  módulos backend, triggers BD, calculadoras de semáforos, scripts CLI; o
  cualquier tarea cuyo entregable principal sea código backend en
  `Dev/src/**`, `Dev/migrations/**` o `Dev/tests/**`.
  Comandos de activación: /be · [MODO: BE]
  Hereda y AMPLÍA la disciplina del modo PROGRAMADOR (/dev) con verificaciones
  específicas que prevenían los bugs documentados en CLAUDE.md §5.1.2.
---

# SKILL — Programador Backend (modo disciplinado)

> Este modo es **más estricto** que `/dev` general. Aplícalo a TODO trabajo
> que toque backend (`Dev/src/**`, `Dev/migrations/**`, `Dev/tests/**`). El
> objetivo es prevenir deterministicamente los bugs documentados en
> `CLAUDE.md §5.1.2`.

## Estructura estándar (fija — ver `CLAUDE.md §13`)

- **Raíz** = donde está `CLAUDE.md`
- **Backend** = `Dev/` (Express + Postgres)
- Cada módulo: `Dev/src/modules/<X>/{routes,controller,service,queries}.js`

## 1. Activación obligatoria

Al entrar en este modo, ejecutar inmediatamente desde `Dev/`:

```bash
npm test --silent | tail -3   # confirmar baseline verde antes de tocar nada
git status                    # confirmar workspace limpio
ls Dev/migrations/ | tail -5  # ver últimas migraciones aplicadas
```

Y consultar mensajes del otro agente:

```bash
ls docs/messages/open/ 2>/dev/null
```

Si hay mensajes con `to: backend` o `to: all` y `state: open`, leerlos
antes de empezar.

## 2. ANTES de escribir código — auditoría de contrato

Para CADA tabla que vas a tocar:

```
□ \d <tabla>  → ver columnas + constraints + FKs
□ \d+ <tabla> → ver triggers BD
   ¿Hay trigger que auto-inserta/auto-valida? Si sí, NO duplicar en service.
□ SELECT * FROM campos_sistema WHERE nombre_tabla='<X>';
   → toda columna mutable debe tener su fila aquí (metadata-driven).
```

Para CADA endpoint que vas a crear/modificar:

```
□ Dev/src/modules/<X>/routes.js   — confirmar autorización (authorize, maintenanceGuard, checkGating)
□ Dev/src/modules/<X>/controller.js — convención case del módulo
□ Dev/src/modules/<X>/queries.js   — JOINs ya existentes
□ Dev/src/modules/<X>/service.js   — patrones de validación
```

Si el endpoint requiere columnas nuevas:
- **PRIMERO**: redactar la migración SQL con `BEGIN; SET LOCAL app.allow_metadata_change='true'; ... COMMIT;`
- **DESPUÉS**: codear el service.

## 3. AL ESCRIBIR — checklist enforced

```
□ Patrón 4-archivos: queries.js → service.js → controller.js → routes.js
□ Migración numerada secuencialmente NNN_descripcion.sql con BEGIN/COMMIT explícitos
□ INSERT en metadata_versiones bumpeando SemVer si la mig cambia capacidad
□ Sin comparaciones `pg TIMESTAMP > $1` cuando $1 es JS Date (pierdes μs)
□ Sin INSERT explícito a tablas con trigger auto-insert (variables_historia, etc.)
□ Para auditoría adicional: SET LOCAL app.audit_X via set_config(..., true)
□ authenticate + authorize + maintenanceGuard + checkGating donde aplique
□ Idempotencia en operaciones que el frontend puede reintentar (cancelar, confirmar)
□ Trazabilidad de estado: si estado_X existe, agregar X_en + X_por con FK
```

## 4. AL ESCRIBIR TESTS

```
□ Tests order-independent: snapshot before/after counts, no `ts > snapshot`
□ Tests state-independent: cada test crea sus fixtures, no asume DB previa
□ Para bypassear triggers BD en setup/cleanup: SET session_replication_role = replica
□ Verificar que el test FALLA si remueves el código que arregla (TDD discipline)
□ Probar happy path + 401 + 403 + 400 + 404 + 409 (cuando aplique)
```

## 5. ANTES de marcar HECHO

```
□ npm run typecheck && npm run lint               → verde
□ npm test (suite completa)                       → verde
□ Verificar migrate desde fresh DB:
    DB_NAME=tmp_$$ createdb && DB_NAME=tmp_$$ npm run migrate
    Si falla aquí, falla en CI.
□ git status:
    - sin migrations/*.sql untracked + src/** staged simultáneamente
    - (el pre-commit hook `orphan-migration-check.sh` bloquea esto)
□ Smoke con curl:
    - happy path → 200/201
    - auth faltante → 401
    - rol incorrecto → 403
    - input inválido → 400
    - inexistente → 404
□ Si el cambio afecta contrato de API: actualizar docs/05-contratos-api.md
□ Si cierras pendientes: footer `Closes be-N` en commit message
```

## 6. ANTES de abrir PR

```
□ Branch en formato feat/be-* | fix/be-* | chore/be-* (§13.3a)
□ PR contiene PRs Description con:
    - Resumen (3-5 bullets)
    - Test plan (qué tests cubren el cambio)
    - Closes / Refs a items de PENDIENTES.md
□ Si el cambio afecta al otro agente:
    - Crear mensaje en docs/messages/open/ con `to: frontend`
    - Etiquetar `breaking` si cambia contrato
```

## 7. Comportamiento prohibido (refuerzo)

```
✗ Marcar "completado" sin `npm run migrate` desde BD fresh
✗ Push directo a `main` — el branch protection lo bloquea
✗ Comparar pg TIMESTAMP > $1 cuando $1 es JS Date
✗ Duplicar INSERT en service cuando trigger BD ya inserta
✗ Commit con migración untracked + service modificado
✗ Tests que dependen de orden o state previo
✗ DELETE/UPDATE de bitácora inmutable (variables_historia, audit_log)
✗ Mergear sin leer mensajes nuevos del otro agente
```

## 8. Tooling enforce

- `.husky/pre-commit` corre `scripts/orphan-migration-check.sh`
- `.github/workflows/ci.yml` job `migrations-clean-apply` valida fresh DB
- Sub-agente `be-reviewer` revisa el diff backend antes de PR

## 9. Salida del modo

Al cerrar la tarea, reportar:
- Commits creados (con tipo y scope)
- Items de PENDIENTES.md cerrados
- Mensajes enviados al frontend (si los hubo)
- Tag/release si aplica
