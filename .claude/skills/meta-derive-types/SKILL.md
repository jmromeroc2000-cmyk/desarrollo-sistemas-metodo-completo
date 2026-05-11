---
name: meta-derive-types
description: >
  Activar para generar TypeScript interfaces desde campos_sistema. Lee la BD y produce
  Dev/frontend/src/api/types/_generated.ts con un interface por tabla en tablas_sistema,
  más helpers ApiResponse<T>, ApiListResponse<T>, ProblemDetail. Frontend importa de
  _generated.ts en vez de escribir tipos a mano — elimina contract drift back↔front.
  Comandos de activación: /meta-derive-types · /meta:types
---

# SKILL — Codegen TypeScript types desde metadata

Lee `campos_sistema` + `tablas_sistema` desde la BD y emite TS interfaces.
**Eliminates contract drift**: el frontend nunca escribe a mano tipos que
puedan diverger del backend.

## Invocación

```
/meta-derive-types
```

Equivalente a `npm run meta:types` (script definido en `Dev/frontend/package.json`).

## Procedimiento

### 1. Verificar precondiciones

```bash
# El script vive en Dev/frontend/scripts/meta-derive-types.js
ls Dev/frontend/scripts/meta-derive-types.js || {
  echo "Script falta. Copiar desde templates/codegen/ del método."
  exit 1
}

# Verificar BD accesible
psql -c "SELECT COUNT(*) FROM tablas_sistema" || {
  echo "BD no accesible o sin metadata. Corre `npm run migrate` primero."
  exit 1
}
```

### 2. Generar

```bash
cd Dev/frontend
npm run meta:types
```

Output: `Dev/frontend/src/api/types/_generated.ts`

### 3. Verificar diff y commit

```bash
git diff Dev/frontend/src/api/types/_generated.ts
# Si hay diff, está bien — la metadata cambió. Commit.
# Si NO hay diff, ya estaba sincronizado.

git add Dev/frontend/src/api/types/_generated.ts
git commit -m "chore(fe): regenera TS types desde metadata"
```

### 4. Verificar imports en frontend

Si renombraste/eliminaste tipos, los callers deben actualizarse. Buscar:

```bash
grep -rn "from.*api/types/_generated" Dev/frontend/src/
```

Si hay imports de tipos viejos (que ya no existen), corregirlos.

## Output esperado del script

```
✓ TS types generados: Dev/frontend/src/api/types/_generated.ts
  13 interfaces, 109 campos.
```

## CI

Job `metadata-snapshot-sync` corre `meta:types` + `git diff --exit-code`.
Si hay drift (frontend olvidó regenerar), CI falla.

## Reglas

- El archivo `_generated.ts` se gitea (no en `.gitignore`).
- NO editar `_generated.ts` a mano. Cualquier cambio requiere regenerar.
- Si necesitas un tipo derivado (ej: `ProductoSinId = Omit<Producto, 'id'>`),
  crearlo en otro archivo (`Dev/frontend/src/api/types/derived.ts`) que
  importa del generado.
- Tests unit que comparan shape contra `Producto` usan el tipo generado
  para que renombres/cambios se detecten en typecheck, no en runtime.
