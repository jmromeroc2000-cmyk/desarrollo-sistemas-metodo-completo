---
name: seed-demo
description: >
  Activar al arrancar un sistema nuevo para poblar la BD con datos demo del dominio
  (productos, clientes, transacciones, etc.). Genera datos coherentes derivados de
  campos_sistema con FKs respetadas. Útil para "ver el sistema con datos" sin tener
  que crear cada item vía UI. NO usar en producción.
  Comandos de activación: /seed-demo
---

# SKILL — Seed de datos demo del dominio

Puebla la BD con datos demo del dominio para development y showcase.
Distinto del `seed-dev-admin` (que solo crea el usuario admin); este
crea datos de NEGOCIO (productos, clientes, etc.).

## Invocación

```
/seed-demo
```

Equivalente a `npm run seed:demo` (script en `Dev/package.json`).

## Procedimiento

### 1. Confirmar contexto

```bash
# Verificar que NO estamos en producción
[ "$SYSTEM_MODE" != "PERFORMANCE" ] || {
  echo "❌ NO se siembra demo en SYSTEM_MODE=PERFORMANCE"
  exit 1
}

# Verificar que la BD está vacía (o pedir confirmación)
COUNT=$(psql -tAc "SELECT COUNT(*) FROM productos" 2>/dev/null || echo 0)
if [ "$COUNT" -gt 0 ]; then
  echo "⚠️  Ya hay $COUNT productos. ¿Sobrescribir? (y/N)"
  read confirm
  [ "$confirm" = "y" ] || exit 0
fi
```

### 2. Generar fixtures coherentes

Para cada tabla CRUD con `generar_ui_crud=1`, generar 5-50 fixtures
respetando:

- Tipos derivados de `campos_sistema.formato_despliegue`
- Validaciones (rangos, regex, enums)
- FKs hacia tablas ya pobladas (orden topológico)
- Trazabilidad (`creado_en`, `creado_por`, `actualizado_en`)

Orden típico (un sistema de inventarios):

```
1. usuarios + usuarios_roles  (ya sembrado por seed-dev-admin)
2. roles                       (ya sembrado por migración 002)
3. almacenes                   (5 fixtures)
4. ubicaciones                 (10 per almacén)
5. categorias                  (10 fixtures)
6. unidades_medida             (5 fixtures: pieza, kg, litro, metro, caja)
7. proveedores                 (10 fixtures)
8. productos                   (50 fixtures con FK a cat/unidad/proveedor)
9. inventario                  (1 row por producto-ubicación, qty random)
10. ordenes_compra             (5 fixtures, mix de estados)
11. entradas                   (5 confirmadas vinculadas a OC)
12. salidas                    (10 fixtures)
13. movimientos                (derivado de entradas/salidas)
```

### 3. Idempotencia

Cada fixture tiene UUID determinístico (basado en su número):
`00000000-0001-0001-0000-000000000001` (almacen 1), etc. Si se re-ejecuta,
hace `ON CONFLICT DO NOTHING` o `UPDATE`.

### 4. Output

```
✓ Seed demo completo.
  - 5 almacenes
  - 50 ubicaciones
  - 10 categorías
  - 5 unidades de medida
  - 10 proveedores
  - 50 productos
  - 250 rows en inventario
  - 5 OC (1 PENDIENTE, 2 CONFIRMADA, 1 PARCIAL, 1 CANCELADA)
  - 5 entradas, 10 salidas
  - 30 movimientos derivados

Login: admin@dev.local / DevAdmin2026!
URL:   http://localhost:5173
```

## Implementación del script

El método NO provee un seed-demo "universal" — cada dominio es distinto.
El template `templates/seed-demo.js` es un skeleton:

```js
// Dev/scripts/seed-demo.js
// Cada proyecto adapta este skeleton a su dominio.

import { Pool } from 'pg';
const pool = new Pool({ /* ... env */ });

async function seedCategorias(client) {
  // 10 categorías de ejemplo
  for (let i = 1; i <= 10; i++) {
    await client.query(`
      INSERT INTO categorias (id, nombre, descripcion, activo)
      VALUES ($1, $2, $3, 1)
      ON CONFLICT (id) DO NOTHING
    `, [
      `00000010-0000-0000-0000-${String(i).padStart(12, '0')}`,
      `Categoría ${i}`,
      `Descripción de la categoría ${i}`,
    ]);
  }
}

// ... seed para cada tabla

async function main() {
  const client = await pool.connect();
  try {
    console.log('Seeding demo data...');
    await seedCategorias(client);
    // await seedUnidades(client);
    // await seedProductos(client);
    // ...
    console.log('✓ Done');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
```

## Reglas

- NO ejecutar nunca en `SYSTEM_MODE=PERFORMANCE` (producción).
- Datos demo deben ser obviamente ficticios (RFC `XAXX010101000`, emails
  `@example.com`, etc.) — sin parecerse a datos reales.
- Idempotente: re-ejecutar no rompe, solo actualiza.
- Script bajo `Dev/scripts/seed-demo.js`, comando en `package.json` como
  `"seed:demo": "node scripts/seed-demo.js"`.
- En CI: NO se corre seed-demo (solo seed-dev-admin para tests e2e).
