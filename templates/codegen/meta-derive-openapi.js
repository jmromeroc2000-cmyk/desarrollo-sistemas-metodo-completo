#!/usr/bin/env node
// templates/codegen/meta-derive-openapi.js
// Copy a: Dev/scripts/meta-derive-openapi.js
//
// Genera OpenAPI 3.1 YAML desde metadata. Útil para integradores B2B,
// herramientas como Postman/Insomnia, generador de SDKs externos.
//
// Uso: node scripts/meta-derive-openapi.js
//
// Output: Dev/openapi.yaml

import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Script vive en Dev/scripts/; output en Dev/openapi.yaml
const OUT_FILE = join(__dirname, '..', 'openapi.yaml');

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

// Mapa de tipo metadata → OpenAPI schema
function openApiSchemaFor(campo) {
  const tipo = campo.formato_despliegue || campo.tipo_validacion;
  const schema = {};

  switch (tipo) {
    case 'UUID':
      schema.type = 'string';
      schema.format = 'uuid';
      break;
    case 'EMAIL':
      schema.type = 'string';
      schema.format = 'email';
      break;
    case 'URL':
      schema.type = 'string';
      schema.format = 'uri';
      break;
    case 'TELEFONO':
      schema.type = 'string';
      schema.pattern = '^\\+?[0-9 ()-]+$';
      break;
    case 'FECHA':
      schema.type = 'string';
      schema.format = 'date';
      break;
    case 'FECHA_HORA':
    case 'TIMESTAMP':
      schema.type = 'string';
      schema.format = 'date-time';
      break;
    case 'HORA':
      schema.type = 'string';
      schema.format = 'time';
      break;
    case 'NUMERO_ENTERO':
      schema.type = 'integer';
      if (campo.valor_minimo != null) schema.minimum = Number(campo.valor_minimo);
      if (campo.valor_maximo != null) schema.maximum = Number(campo.valor_maximo);
      break;
    case 'NUMERO_DECIMAL':
    case 'MONEDA_MXN':
    case 'PORCENTAJE':
      schema.type = 'number';
      if (campo.valor_minimo != null) schema.minimum = Number(campo.valor_minimo);
      if (campo.valor_maximo != null) schema.maximum = Number(campo.valor_maximo);
      break;
    case 'BOOLEANO_SI_NO':
    case 'BOOLEANO_ACTIVO':
      schema.type = 'integer';
      schema.enum = [0, 1];
      break;
    case 'ESTADO':
    case 'RELACION':
      schema.type = 'string';
      if (campo.valores_posibles) {
        schema.enum = campo.valores_posibles.split(',').map((s) => s.trim());
      }
      break;
    case 'TEXTO':
    case 'TEXTO_LARGO':
    case 'CODIGO':
    case 'RFC':
    case 'SISTEMA':
    default:
      schema.type = 'string';
      break;
  }

  if (campo.mensaje_ayuda) schema.description = campo.mensaje_ayuda;
  if (campo.obligatorio === 0) schema.nullable = true;

  return schema;
}

function yamlDump(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  const lines = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) {
        lines.push(`${pad}${k}: []`);
      } else if (typeof v[0] === 'string' || typeof v[0] === 'number') {
        lines.push(`${pad}${k}: [${v.map((x) => (typeof x === 'string' ? `"${x.replace(/"/g, '\\"')}"` : x)).join(', ')}]`);
      } else {
        lines.push(`${pad}${k}:`);
        for (const item of v) {
          if (typeof item === 'object') {
            const sub = yamlDump(item, indent + 1).split('\n');
            sub[0] = pad + '  - ' + sub[0].trim();
            for (let i = 1; i < sub.length; i++) sub[i] = '    ' + sub[i];
            lines.push(sub.join('\n'));
          } else {
            lines.push(`${pad}  - ${item}`);
          }
        }
      }
    } else if (typeof v === 'object') {
      lines.push(`${pad}${k}:`);
      lines.push(yamlDump(v, indent + 1));
    } else if (typeof v === 'string') {
      const needsQuotes = v.includes(':') || v.includes('#') || v.startsWith('-') || v.includes('\n');
      lines.push(`${pad}${k}: ${needsQuotes ? `"${v.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"` : v}`);
    } else {
      lines.push(`${pad}${k}: ${v}`);
    }
  }
  return lines.join('\n');
}

async function generateOpenApi() {
  const client = await pool.connect();
  try {
    const { rows: tablas } = await client.query(`
      SELECT nombre_tabla, descripcion, generar_ui_crud
      FROM tablas_sistema
      WHERE generar_ui_crud = 1
      ORDER BY nombre_tabla
    `);

    const { rows: campos } = await client.query(`
      SELECT nombre_tabla, nombre_campo, mensaje_ayuda, formato_despliegue,
             tipo_validacion, valores_posibles, valor_minimo, valor_maximo, obligatorio
      FROM campos_sistema
      ORDER BY nombre_tabla, orden_despliegue, nombre_campo
    `);

    const byTable = new Map();
    for (const c of campos) {
      if (!byTable.has(c.nombre_tabla)) byTable.set(c.nombre_tabla, []);
      byTable.get(c.nombre_tabla).push(c);
    }

    const spec = {
      openapi: '3.1.0',
      info: {
        title: 'API',
        version: '1.0.0',
        description: 'Auto-generado desde metadata (tablas_sistema + campos_sistema).',
      },
      servers: [{ url: '/v1' }],
      components: {
        schemas: {
          ProblemDetail: {
            type: 'object',
            required: ['type', 'title', 'status', 'detail'],
            properties: {
              type: { type: 'string', format: 'uri', description: 'URI identifier estable del tipo de error.' },
              title: { type: 'string', description: 'Resumen ≤120 chars.' },
              status: { type: 'integer', description: 'HTTP status code.' },
              detail: { type: 'string', description: 'Descripción accionable ≤500 chars.' },
              instance: { type: 'string', description: 'URI del recurso/request donde ocurrió.' },
              correlation_id: { type: 'string', format: 'uuid' },
            },
          },
        },
        responses: {
          NotFound: {
            description: 'Recurso no existe.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' } } },
          },
          Unauthorized: {
            description: 'No autenticado.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' } } },
          },
          Forbidden: {
            description: 'Rol no autoriza el recurso.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' } } },
          },
          Conflict: {
            description: 'Conflicto de estado.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' } } },
          },
        },
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
      security: [{ bearerAuth: [] }],
      paths: {},
    };

    for (const tabla of tablas) {
      const fields = byTable.get(tabla.nombre_tabla) || [];
      if (fields.length === 0) continue;

      const TypeName = toPascalCase(tabla.nombre_tabla);
      const required = fields.filter((c) => c.obligatorio === 1).map((c) => c.nombre_campo);
      const properties = {};
      for (const c of fields) {
        properties[c.nombre_campo] = openApiSchemaFor(c);
      }

      spec.components.schemas[TypeName] = {
        type: 'object',
        description: tabla.descripcion,
        ...(required.length > 0 && { required }),
        properties,
      };

      const pathBase = `/${tabla.nombre_tabla.replace(/_/g, '-')}`;
      spec.paths[pathBase] = {
        get: {
          tags: [tabla.nombre_tabla],
          summary: `Lista de ${tabla.nombre_tabla}`,
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: `#/components/schemas/${TypeName}` } },
                      next_cursor: { type: 'string', nullable: true },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: [tabla.nombre_tabla],
          summary: `Crea ${tabla.nombre_tabla}`,
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: `#/components/schemas/${TypeName}` } },
            },
          },
          responses: {
            '201': {
              description: 'Created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { data: { $ref: `#/components/schemas/${TypeName}` } },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '409': { $ref: '#/components/responses/Conflict' },
          },
        },
      };

      spec.paths[`${pathBase}/{id}`] = {
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        get: {
          tags: [tabla.nombre_tabla],
          summary: `Obtiene ${tabla.nombre_tabla} por id`,
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { data: { $ref: `#/components/schemas/${TypeName}` } },
                  },
                },
              },
            },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        patch: {
          tags: [tabla.nombre_tabla],
          summary: `Actualiza ${tabla.nombre_tabla}`,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: `#/components/schemas/${TypeName}` } } },
          },
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { data: { $ref: `#/components/schemas/${TypeName}` } },
                  },
                },
              },
            },
            '404': { $ref: '#/components/responses/NotFound' },
            '409': { $ref: '#/components/responses/Conflict' },
          },
        },
        delete: {
          tags: [tabla.nombre_tabla],
          summary: `Elimina ${tabla.nombre_tabla}`,
          responses: {
            '204': { description: 'No content' },
            '404': { $ref: '#/components/responses/NotFound' },
            '409': { $ref: '#/components/responses/Conflict' },
          },
        },
      };
    }

    const yaml = `# AUTO-GENERADO — NO EDITAR A MANO.\n# Para regenerar: npm run openapi:gen\n\n${yamlDump(spec)}\n`;
    await writeFile(OUT_FILE, yaml, 'utf8');

    console.log(`✓ OpenAPI 3.1 generado: ${OUT_FILE}`);
    console.log(`  ${tablas.length} recursos, ${Object.keys(spec.paths).length} paths.`);
  } finally {
    client.release();
  }
}

generateOpenApi()
  .then(() => pool.end())
  .catch((err) => {
    console.error('Error:', err.message);
    pool.end();
    process.exit(1);
  });
