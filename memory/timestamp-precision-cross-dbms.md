---
name: Precisión de timestamps varía entre los 6 DBMS — comparar con > es flaky
description: Postgres usa μs, MySQL/SQL Server/Oracle/DB2/Spanner usan ms o 100ns. JS Date trunca todo a ms. Comparar `tabla.ts > $1` con $1 Date puede ser TRUE para la MISMA fila por el formato de roundtrip.
type: feedback
---

Cada DBMS almacena timestamps con precisión distinta. Cuando comparas
`tabla.ts > $1` donde $1 viene de `new Date()` en Node, el resultado depende
del DBMS — y casi siempre es **flaky** porque la precisión se pierde en el
roundtrip JS Date ↔ TIMESTAMP de la BD.

## Precisión por DBMS

| DBMS | Precisión nativa | Notas |
|------|------------------|-------|
| **PostgreSQL** | μs (6 dígitos) | `TIMESTAMP(6)` por default. Drivers (node-pg) truncan a JS Date (ms). |
| **MySQL** | ms (3 dígitos) si `DATETIME(3)`, segundos si `DATETIME`. Default: segundos. | Configurar columna con `(3)` o usar `VARCHAR` ISO. |
| **SQL Server** | 100 ns (`datetime2`) o ms (`datetime`). | `datetime2` recomendado. |
| **Oracle** | ns (9 dígitos) `TIMESTAMP(9)` máx. Default: μs. | `TIMESTAMP(6)` portable. |
| **DB2** | μs (6 dígitos) `TIMESTAMP(6)`. | Idem PG. |
| **Spanner** | ms con offset. | Tipo `TIMESTAMP`, precisión limitada. |
| **JS Date** | ms (3 dígitos) | Único punto común. |

## Bug clásico

```
PostgreSQL:
  variables_historia.modificado_en = 2026-05-11 04:32:15.123456  (μs en BD)
  snapshot.modificado_en (Date)    = 2026-05-11 04:32:15.123     (ms en Node)
                                     ↓ se manda como $1
  $1 efectivo                       = 2026-05-11 04:32:15.123000

  historia > $1  →  TRUE (123456 > 123000) — pero es la MISMA fila

Oracle (similar):
  historia.modificado_en = 2026-05-11 04:32:15.123456000  (ns en BD)
  $1                      = 2026-05-11 04:32:15.123000000
  → TRUE para la misma fila
```

CI con DBMS rápido (siempre μs/ns no-cero) hace que el test pase localmente
cuando los μs casualmente son cero, pero falle determinísticamente en CI.

## Aplicar

**NUNCA** escribir tests con este patrón:

```js
// ❌ FRÁGIL — los μs en BD pueden ser > que los ms del snapshot
const { rows } = await c.query(
  'SELECT COUNT(*) AS n FROM historia WHERE clave=$1 AND modificado_en > $2',
  ['SYSTEM_MODE', snapshot.modificado_en],
);
expect(rows[0].n).toBe(0);
```

**SIEMPRE** usar uno de estos patrones portables:

### A. count-before / count-after (preferido)

```js
// ✓ PORTABLE — diferencia de conteos
const before = await countRows('historia', 'clave=$1', ['SYSTEM_MODE']);
await accion();  // no debería escribir historia
const after = await countRows('historia', 'clave=$1', ['SYSTEM_MODE']);
expect(after).toBe(before);
```

### B. ORDER BY ts DESC LIMIT 1 (sin filtro temporal)

```js
// ✓ PORTABLE — toma la última fila por orden, sin filtrar por ts > snapshot
const rows = await runQueryRows(c,
  'SELECT clave, valor_anterior FROM historia ORDER BY modificado_en DESC LIMIT 1');
expect(rows[0].valor_anterior).toBe('viejo');
```

### C. Truncar a ms en ambos lados (último recurso)

NO portable directo entre DBMS. Equivalentes:
- PostgreSQL: `date_trunc('milliseconds', ts)`
- MySQL: substring del string ISO
- SQL Server: `CAST(ts AS DATETIME)`
- Oracle: `CAST(ts AS TIMESTAMP(3))`
- DB2: `VARCHAR_FORMAT(ts, 'YYYY-MM-DD HH24:MI:SS.FF3')`

Patrones A o B son siempre mejores.

## Aplicar a

- Tests de "no se escribió en bitácora tras este no-op"
- Filtros de paginación "items creados después de X"
- Verificación de timestamps en triggers AFTER UPDATE
- Cualquier comparación temporal con `>`/`<`/`>=`/`<=` entre BD y JS

## Soporte del método

- `templates/tests/helpers/db-test-helper.js` exporta `countRows(table, where?, params?)`
- Skill `/be` recuerda esta regla en su checklist (§5.1.3 del CLAUDE.md)
- Sub-agente `be-reviewer` busca el patrón flaky en diffs y reporta
