---
name: pg TIMESTAMP precision vs JS Date
description: pg almacena timestamps con precisión μs; node-pg trunca a ms al convertir a Date. Comparar `historia.ts > $1` con $1 Date puede ser TRUE para la misma fila.
type: feedback
---

PostgreSQL almacena `TIMESTAMP` con precisión de **microsegundos** (6 dígitos
después del segundo). El driver `node-pg` lo convierte a `JS Date` cuando lo
devuelve, y JS Date solo soporta **milisegundos** (3 dígitos). Los últimos 3
dígitos (los μs) se truncan.

**Why:** Cuando luego pasas ese Date como parámetro de query (`$1`), pg lo
convierte a TIMESTAMP nuevamente — pero con μs = 0. Entonces:

```
variables_historia.modificado_en = 2026-05-11 04:32:15.123456  (en BD)
snapshot.modificado_en (Date)    = 2026-05-11 04:32:15.123     (en Node)
                                   ↓ se manda como $1 a pg
$1 efectivo                       = 2026-05-11 04:32:15.123000

historia > $1  →  TRUE (123456 > 123000) — pero es la MISMA fila
```

Esto causa flakes determinísticos en CI: el test pasa local cuando los μs
casualmente son cero, falla en CI donde son siempre no-cero.

**How to apply:**
- NUNCA escribir `WHERE historia.ts > $1` con $1 Date desde Node.
- Patrones aceptables:
  - **count-before / count-after**: `COUNT(*)` antes y después de la acción,
    `expect(after).toBe(before)`. Order-independent y precision-independent.
  - **última fila por LIMIT**: `ORDER BY ts DESC LIMIT 1`, sin filtro.
  - **truncar ambos lados a ms**: `WHERE date_trunc('milliseconds', ts) >
    date_trunc('milliseconds', $1)`.

Aplica especialmente a:
- Tests de "no se escribió historia tras este no-op"
- Filtros de paginación "items creados después de X"
- Verificación de timestamps en triggers AFTER UPDATE
