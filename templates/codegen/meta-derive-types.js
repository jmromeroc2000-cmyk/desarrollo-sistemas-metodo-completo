#!/usr/bin/env node
// templates/codegen/meta-derive-types.js
// Copy a: Dev/frontend/scripts/meta-derive-types.js
//
// Lee `campos_sistema` + `tablas_sistema` desde la BD y genera interfaces
// TypeScript en `Dev/frontend/src/api/types/_generated.ts`.
//
// Uso: node scripts/meta-derive-types.js
//
// Idempotente: produce siempre el mismo output para la misma metadata.
// CI lo corre y `git diff --exit-code` para detectar drift.

import 'dotenv/config';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
// El script vive en Dev/frontend/scripts/, output va a Dev/frontend/src/api/types/
const OUT_FILE = join(__dirname, '..', 'src', 'api', 'types', '_generated.ts');

const pool = new pg.Pool({
  host:     process.env.DB_HOST     ?? 'localhost',
  port:     Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME     ?? 'sistema_dev',
  user:     process.env.DB_USER     ?? 'inv_user',
  password: process.env.DB_PASSWORD ?? '',
});

// Mapa tipo_validacion → TS type
const TS_TYPES = {
  TEXTO:           'string',
  TEXTO_LARGO:     'string',
  CODIGO:          'string',
  EMAIL:           'string',
  TELEFONO:        'string',
  URL:             'string',
  UUID:            'string',
  RFC:             'string',
  NUMERO_ENTERO:   'number',
  NUMERO_DECIMAL:  'number',
  MONEDA_MXN:      'number',
  PORCENTAJE:      'number',
  FECHA:           'string',  // ISO date "2026-05-11"
  FECHA_HORA:      'string',  // ISO 8601 "2026-05-11T10:00:00.000Z"
  HORA:            'string',
  BOOLEANO_SI_NO:  '0 | 1',
  BOOLEANO_ACTIVO: '0 | 1',
  ESTADO:          'string',  // refinado abajo si hay valores_posibles
  RELACION:        'string',  // UUID FK
  SISTEMA:         'string',
};

function toPascalCase(snake) {
  return snake
    .split(/[_-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join('');
}

function tsTypeFor(campo) {
  // Si tiene valores_posibles (enum), generar union de literales
  if (campo.valores_posibles && campo.tipo_validacion === 'CATALOGO') {
    const values = campo.valores_posibles
      .split(',')
      .map((v) => `'${v.trim().replace(/'/g, "\\'")}'`)
      .join(' | ');
    return values;
  }

  let base = TS_TYPES[campo.formato_despliegue] || TS_TYPES[campo.tipo_validacion] || 'unknown';

  // Nullable si NOT obligatorio
  if (campo.obligatorio === 0) {
    base = `${base} | null`;
  }

  return base;
}

function tsCommentFor(campo) {
  const lines = [];
  if (campo.mensaje_ayuda) lines.push(campo.mensaje_ayuda);
  if (campo.tipo_validacion && campo.tipo_validacion !== 'NINGUNA') {
    lines.push(`Validación: ${campo.tipo_validacion}${campo.valores_posibles ? ` (${campo.valores_posibles})` : ''}`);
  }
  if (campo.sensible_lfpdppp === 1) {
    lines.push(`⚠️ Dato sensible LFPDPPP (${campo.categoria_dato_personal || 'sin categoría'})`);
  }
  if (lines.length === 0) return '';
  return `  /**\n${lines.map((l) => `   * ${l}`).join('\n')}\n   */\n`;
}

async function generateTypes() {
  const client = await pool.connect();
  try {
    // Leer todas las tablas + campos
    const { rows: tablas } = await client.query(`
      SELECT nombre_tabla, funcion, descripcion, generar_ui_crud
      FROM tablas_sistema
      WHERE nombre_tabla NOT LIKE '_%'  -- excluir tablas internas
      ORDER BY nombre_tabla
    `);

    const { rows: campos } = await client.query(`
      SELECT nombre_tabla, nombre_campo, nombre_corto, nombre_largo,
             formato_despliegue, tipo_validacion, valores_posibles,
             obligatorio, sensible_lfpdppp, categoria_dato_personal,
             mensaje_ayuda, orden_despliegue
      FROM campos_sistema
      ORDER BY nombre_tabla, orden_despliegue, nombre_campo
    `);

    // Agrupar campos por tabla
    const byTable = new Map();
    for (const c of campos) {
      if (!byTable.has(c.nombre_tabla)) byTable.set(c.nombre_tabla, []);
      byTable.get(c.nombre_tabla).push(c);
    }

    // Generar output
    let out = `/**
 * AUTO-GENERADO — NO EDITAR A MANO.
 *
 * Generado por: scripts/meta-derive-types.js
 * Fuente:       campos_sistema + tablas_sistema en BD
 * Tablas:       ${tablas.length}, Campos: ${campos.length}
 *
 * Para regenerar: \`npm run meta:types\`
 * CI verifica drift con \`git diff --exit-code\` en este archivo.
 */

`;

    for (const tabla of tablas) {
      const fields = byTable.get(tabla.nombre_tabla) || [];
      if (fields.length === 0) continue;

      const interfaceName = toPascalCase(tabla.nombre_tabla);

      out += `/**\n * ${tabla.descripcion || tabla.nombre_tabla}\n`;
      out += ` * Función: ${tabla.funcion}\n`;
      out += ` */\n`;
      out += `export interface ${interfaceName} {\n`;

      for (const c of fields) {
        const comment = tsCommentFor(c);
        if (comment) out += comment;
        out += `  ${c.nombre_campo}: ${tsTypeFor(c)};\n`;
      }
      out += `}\n\n`;

      // Si es catálogo CRUD, agregar tipo "Create" y "Update"
      if (tabla.funcion === 'CATALOGO' && tabla.generar_ui_crud === 1) {
        const writableFields = fields.filter(
          (c) => !['id', 'creado_en', 'actualizado_en', 'protegido'].includes(c.nombre_campo),
        );
        out += `export type ${interfaceName}Create = {\n`;
        for (const c of writableFields) {
          out += `  ${c.nombre_campo}${c.obligatorio === 0 ? '?' : ''}: ${tsTypeFor(c).replace(' | null', '')};\n`;
        }
        out += `};\n\n`;

        out += `export type ${interfaceName}Update = Partial<${interfaceName}Create>;\n\n`;
      }
    }

    // Tipos compartidos
    out += `
/**
 * Envelope estándar de respuestas (CLAUDE.md §5.1.2.F.3).
 */
export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  next_cursor?: string | null;
}

/**
 * Problem+JSON (RFC 9457, CLAUDE.md §5.1.2.F.2).
 */
export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  correlation_id?: string;
  // Extensions (semaphore, errors, etc.) son aditivas.
  [key: string]: unknown;
}
`;

    // Escribir
    await mkdir(dirname(OUT_FILE), { recursive: true });
    await writeFile(OUT_FILE, out, 'utf8');

    console.log(`✓ TS types generados: ${OUT_FILE}`);
    console.log(`  ${tablas.length} interfaces, ${campos.length} campos.`);
  } finally {
    client.release();
  }
}

generateTypes()
  .then(() => pool.end())
  .catch((err) => {
    console.error('Error:', err.message);
    pool.end();
    process.exit(1);
  });
