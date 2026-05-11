#!/usr/bin/env node
// templates/codegen/front-msw-from-meta.js
// Copy a: Dev/frontend/scripts/msw-from-meta.js
//
// Genera MSW v2 handlers para los endpoints CRUD de cada tabla con
// generar_ui_crud=1, con fixtures derivados de campos_sistema.
//
// Uso: node scripts/msw-from-meta.js
//
// CI corre y `git diff --exit-code` para detectar drift.

import 'dotenv/config';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, '..', 'src', 'test', 'msw', '_generated.ts');

const pool = new pg.Pool({
  host:     process.env.DB_HOST     ?? 'localhost',
  port:     Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME     ?? 'sistema_dev',
  user:     process.env.DB_USER     ?? 'inv_user',
  password: process.env.DB_PASSWORD ?? '',
});

function toPascalCase(snake) {
  return snake.split(/[_-]/).map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('');
}

function toCamelCase(snake) {
  const pc = toPascalCase(snake);
  return pc.charAt(0).toLowerCase() + pc.slice(1);
}

// Genera un valor fixture determinístico para un campo, basado en su tipo
function fixtureValueFor(campo, index = 0) {
  const tipo = campo.formato_despliegue || campo.tipo_validacion;
  switch (tipo) {
    case 'UUID':
      return `'${String(index).padStart(8, '0')}-0000-0000-0000-000000000000'`;
    case 'TEXTO':
    case 'TEXTO_LARGO':
    case 'CODIGO':
      return `'${campo.nombre_campo}_${index + 1}'`;
    case 'EMAIL':
      return `'user${index + 1}@example.com'`;
    case 'TELEFONO':
      return `'+52 555 ${String(1000000 + index).padStart(7, '0')}'`;
    case 'URL':
      return `'https://example.com/${campo.nombre_campo}/${index + 1}'`;
    case 'RFC':
      return `'XAXX010101000'`;
    case 'NUMERO_ENTERO':
      return `${100 + index}`;
    case 'NUMERO_DECIMAL':
    case 'MONEDA_MXN':
      return `${(100 + index).toFixed(2)}`;
    case 'PORCENTAJE':
      return `${(0.5 + index * 0.1).toFixed(2)}`;
    case 'FECHA':
      return `'2026-05-${String(11 + index).padStart(2, '0')}'`;
    case 'FECHA_HORA':
    case 'TIMESTAMP':
      return `'2026-05-11T${String(10 + index).padStart(2, '0')}:00:00.000Z'`;
    case 'HORA':
      return `'${String(10 + index).padStart(2, '0')}:00:00'`;
    case 'BOOLEANO_SI_NO':
    case 'BOOLEANO_ACTIVO':
      return index % 2 === 0 ? '1' : '0';
    case 'ESTADO':
    case 'RELACION':
      if (campo.valores_posibles) {
        const opts = campo.valores_posibles.split(',').map((s) => s.trim());
        return `'${opts[index % opts.length]}'`;
      }
      return `'${String(index).padStart(8, '0')}-0000-0000-0000-000000000000'`;
    default:
      return `'value-${index + 1}'`;
  }
}

async function generateMsw() {
  const client = await pool.connect();
  try {
    const { rows: tablas } = await client.query(`
      SELECT nombre_tabla, descripcion
      FROM tablas_sistema
      WHERE generar_ui_crud = 1
      ORDER BY nombre_tabla
    `);

    const { rows: campos } = await client.query(`
      SELECT nombre_tabla, nombre_campo, formato_despliegue, tipo_validacion,
             valores_posibles, obligatorio
      FROM campos_sistema
      ORDER BY nombre_tabla, orden_despliegue, nombre_campo
    `);

    const byTable = new Map();
    for (const c of campos) {
      if (!byTable.has(c.nombre_tabla)) byTable.set(c.nombre_tabla, []);
      byTable.get(c.nombre_tabla).push(c);
    }

    let out = `/**
 * AUTO-GENERADO — NO EDITAR A MANO.
 *
 * MSW v2 handlers para endpoints CRUD de cada tabla con
 * generar_ui_crud=1. Fixtures derivados de campos_sistema.
 *
 * Para regenerar: \`npm run msw:gen\`
 */

import { http, HttpResponse } from 'msw';
import type {
${tablas.map((t) => `  ${toPascalCase(t.nombre_tabla)},`).join('\n')}
} from '../../api/types/_generated';

`;

    for (const tabla of tablas) {
      const fields = byTable.get(tabla.nombre_tabla) || [];
      if (fields.length === 0) continue;

      const TypeName = toPascalCase(tabla.nombre_tabla);
      const varName = toCamelCase(tabla.nombre_tabla);

      // Fixtures (3 items)
      out += `const fixture${TypeName}: ${TypeName}[] = [\n`;
      for (let i = 0; i < 3; i++) {
        out += `  {\n`;
        for (const c of fields) {
          out += `    ${c.nombre_campo}: ${fixtureValueFor(c, i)},\n`;
        }
        out += `  },\n`;
      }
      out += `];\n\n`;

      // Handlers
      const path = tabla.nombre_tabla.replace(/_/g, '-');
      out += `export const handlers${TypeName} = [\n`;

      // GET lista
      out += `  http.get('/v1/${path}', () => {\n`;
      out += `    return HttpResponse.json({ data: fixture${TypeName}, next_cursor: null });\n`;
      out += `  }),\n`;

      // GET detalle
      out += `  http.get('/v1/${path}/:id', ({ params }) => {\n`;
      out += `    const item = fixture${TypeName}.find((x) => x.id === params.id);\n`;
      out += `    return item\n`;
      out += `      ? HttpResponse.json({ data: item })\n`;
      out += `      : HttpResponse.json(\n`;
      out += `          { type: 'https://errors/not-found', title: 'Not found', status: 404, detail: '${TypeName} \${params.id} no existe' },\n`;
      out += `          { status: 404 }\n`;
      out += `        );\n`;
      out += `  }),\n`;

      // POST
      out += `  http.post('/v1/${path}', async ({ request }) => {\n`;
      out += `    const body = await request.json() as Partial<${TypeName}>;\n`;
      out += `    const created = { ...fixture${TypeName}[0], ...body, id: '99999999-0000-0000-0000-000000000000' };\n`;
      out += `    return HttpResponse.json({ data: created }, { status: 201 });\n`;
      out += `  }),\n`;

      // PATCH
      out += `  http.patch('/v1/${path}/:id', async ({ params, request }) => {\n`;
      out += `    const item = fixture${TypeName}.find((x) => x.id === params.id);\n`;
      out += `    if (!item) return HttpResponse.json({ type: 'https://errors/not-found', title: 'Not found', status: 404, detail: 'No existe' }, { status: 404 });\n`;
      out += `    const body = await request.json() as Partial<${TypeName}>;\n`;
      out += `    return HttpResponse.json({ data: { ...item, ...body } });\n`;
      out += `  }),\n`;

      // DELETE
      out += `  http.delete('/v1/${path}/:id', ({ params }) => {\n`;
      out += `    const item = fixture${TypeName}.find((x) => x.id === params.id);\n`;
      out += `    return item ? new HttpResponse(null, { status: 204 }) : HttpResponse.json({ type: 'https://errors/not-found', title: 'Not found', status: 404, detail: 'No existe' }, { status: 404 });\n`;
      out += `  }),\n`;

      out += `];\n\n`;
    }

    // Export consolidado
    out += `export const handlers = [\n`;
    for (const t of tablas) {
      out += `  ...handlers${toPascalCase(t.nombre_tabla)},\n`;
    }
    out += `];\n`;

    await mkdir(dirname(OUT_FILE), { recursive: true });
    await writeFile(OUT_FILE, out, 'utf8');

    console.log(`✓ MSW handlers generados: ${OUT_FILE}`);
    console.log(`  ${tablas.length} recursos, ${tablas.length * 5} handlers totales.`);
  } finally {
    client.release();
  }
}

generateMsw()
  .then(() => pool.end())
  .catch((err) => {
    console.error('Error:', err.message);
    pool.end();
    process.exit(1);
  });
