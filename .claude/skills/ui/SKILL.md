---
name: programador-frontend-ui
description: >
  Activar cuando el usuario pida: crear/modificar pantallas, formularios, modales,
  componentes UI; mutations de TanStack Query; estilos Tailwind; rutas; navegación;
  validación de forms; o cualquier tarea cuyo entregable principal sea código
  frontend de una aplicación React/Tailwind/TanStack-Query.
  Comandos de activación: /ui · [MODO: UI]
  Hereda y AMPLÍA la disciplina del modo PROGRAMADOR (/dev) con verificaciones
  específicas que prevenían los bugs documentados en CLAUDE.md §5.1.1.
---

# SKILL — Programador Frontend UI (modo disciplinado)

> Este modo es **más estricto** que `/dev` general. Aplícalo a TODO trabajo que
> toque la UI del frontend (`Dev/frontend/src/**`). El objetivo es prevenir
> deterministicamente los bugs de UI documentados en `CLAUDE.md §5.1.1`.

## Estructura estándar (fija — ver `CLAUDE.md §13`)

Todos los proyectos siguen el mismo layout. Los paths que aparecen en este
documento son **literales y fijos**:

- **Raíz del proyecto** = donde está `CLAUDE.md` (cwd al iniciar Claude)
- **Backend** = `Dev/` (Express + Postgres)
- **Frontend** = `Dev/frontend/` (Vite + React)

## 1. Activación obligatoria

Al entrar en este modo, ejecutar inmediatamente desde `Dev/frontend/`:

```bash
npm run preflight
```

Esto valida el estado base del proyecto antes de hacer cambios. Si falla,
detener y reportar al usuario antes de modificar nada.

## 2. ANTES de escribir código UI — auditoría de contrato

Para cada endpoint que la UI va a consumir, leer del backend (NO de docs):

```
□ Dev/src/modules/<X>/routes.js     — ¿el endpoint EXISTE? ¿qué rol lo accede?
□ Dev/src/modules/<X>/controller.js — campos exactos del request body
                                            (snake_case vs camelCase varía
                                             por módulo en algunos proyectos —
                                             consultar el código real)
□ Dev/src/modules/<X>/queries.js    — ¿el SELECT incluye nombres
                                            relacionados (e.g. proveedor_nombre,
                                            almacen_nombre)? Si no, agregar
                                            JOIN al backend ANTES de la UI
□ curl al endpoint con un caso real — confirmar shape de la respuesta
```

**Comportamiento prohibido:** asumir que el endpoint existe sin verificar; asumir
nombres de campo desde docs (que pueden estar desactualizados); inventar
endpoints que no están en `routes.js`.

## 3. AL ESCRIBIR el componente o mutation

### Para CRUDs de catálogo

Usar siempre el generador en lugar de copiar-pegar:

```bash
# desde Dev/frontend/:
npm run gen:catalog
```

El generador crea: tipos, módulo API, queries con factory tipado correcto,
página Lista, modales de alta/edit/delete. Garantiza que ningún CRUD nuevo
se monte con queryKey roto.

### Para componentes y mutaciones manuales

```
□ queryKey de useQuery viene del factory queryKeys
  (Dev/frontend/src/queries/keys.ts).
  Las mutations invalidan queryKeys.<recurso>.all. Verificar con preflight
  que los strings matchean (ej: ['unidades'] vs ['unidades-medida']).

□ Tokens Tailwind: cualquier text-X-NNN, bg-X-NNN, border-X-NNN debe existir
  en los tokens del proyecto (Style Dictionary genera el @theme desde
  Dev/frontend/tokens/colors.json). Tailwind v4 silently drop si el token no
  está definido. El preflight detecta esto.

□ Dark mode: cualquier text-neutral-NNN tiene su variante dark:text-neutral-NNN
  en la misma string. Sin esto, falla WCAG en dark mode.

□ Forms: cubrir 4 estados — vacío, inválido, error servidor, success.

□ react-hook-form: register() solo para Input/Textarea estándar; para
  componentes custom (NumberInput, DatePicker, Combobox, Select, Checkbox,
  Switch) usar Controller. Esto está enforced por la regla ESLint
  `sistemainv-ui/no-rhf-register-on-custom`.

□ Inputs date: <DatePicker>, NUNCA <input type="date"> nativo. Enforced por
  `sistemainv-ui/no-native-date-input`.

□ React Compiler activo: NO useEffect+setState para sincronizar props.
  Usar derived state con useState extra.
```

## 4. ANTES de marcar HECHO — verificación end-to-end

```
□ npm run preflight           → reglas deterministas (queryKeys, tokens, etc.)
□ npm run typecheck && lint && test → verde
□ Smoke en navegador real del FLUJO COMPLETO (no solo render):
   - CRUD: crear → ver en lista → editar → ver cambio → eliminar → ver ausencia
   - Form: vacío + inválido + success + error servidor
□ a11y E2E (npm run test:a11y) si tocas color/token/dark mode
□ crud-smoke E2E (npm run test:e2e:smoke) si tocas alguna mutation
□ Memoria del proyecto consultada por patrones recurrentes
```

## 5. Flujo recomendado para feature UI nueva

```
1. /ui                                    activa el modo
2. npm run preflight                      verifica estado base
3. Auditar contrato backend (sección 2)
4. npm run gen:catalog (si es CRUD)
   o crear archivos manualmente siguiendo el patrón
5. Implementar
6. npm run preflight                      cada vez que termines un archivo
7. npm run typecheck && lint && test
8. Smoke en navegador
9. npm run test:a11y && test:e2e:smoke    si aplica
10. Marcar HECHO al usuario
```

## 6. Sub-agentes disponibles

- **`ui-reviewer`** (en `.claude/agents/ui-reviewer.md`) — revisa cambios
  grandes de UI contra el DoD §5.1.1. Útil para refactors de N pantallas.
  Invocar con: `Agent(subagent_type: 'ui-reviewer', prompt: '...')`.

## 7. Comportamiento prohibido

```
✗ Marcar "completado" sin probar el flujo end-to-end real
✗ Inventar endpoints o asumir respuesta del backend sin verificar
✗ Usar string hardcoded en queryKey/invalidate en vez del factory
✗ Agregar clases Tailwind sin verificar que el token existe
✗ Replicar patrón en N pantallas sin probar la primera completa
✗ Confiar en docs/CLAUDE.md sobre el contrato del API — el código del
  backend es la única fuente verificable de verdad
✗ Codificar UI sin antes correr `npm run preflight`
```

## Referencias

- `CLAUDE.md §5.1.1` — Definition of Done para UI (versión completa)
- `CLAUDE.md §13` — Estructura estándar del proyecto (layout fijo)
- `Dev/frontend/scripts/validate-frontend.js` — preflight determinista
- `.claude/agents/ui-reviewer.md` — sub-agente de revisión semántica
