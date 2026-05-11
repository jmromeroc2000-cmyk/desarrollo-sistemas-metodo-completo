// templates/eslint-rules/local-rules.js
// Copy a: Dev/frontend/eslint-rules/local-rules.js
//
// Reglas ESLint custom del plugin "sistemainv-ui" (renombrar plugin por
// proyecto). Bloquean en build los patrones que el método declara como
// prohibidos en frontend DoD §5.1.1.

export default {
  rules: {
    // ───────────────────────────────────────────────────────────
    // no-hardcoded-querykey
    // ───────────────────────────────────────────────────────────
    'no-hardcoded-querykey': {
      meta: {
        type: 'problem',
        docs: {
          description: 'queryKey debe venir del factory queryKeys, no string inline',
        },
        schema: [],
        messages: {
          hardcoded:
            'queryKey debe importarse del factory `queryKeys` (src/queries/keys.ts), no usar strings inline. Riesgo: mismatch entre useQuery e invalidateQueries.',
        },
      },
      create(context) {
        function checkProperty(node) {
          if (!node || node.type !== 'Property') return;
          const keyName = node.key && (node.key.name || node.key.value);
          if (keyName !== 'queryKey') return;

          const value = node.value;
          // Permitido: identifier (queryKeys.X.all), MemberExpression, CallExpression
          if (
            value.type === 'Identifier' ||
            value.type === 'MemberExpression' ||
            value.type === 'CallExpression'
          ) {
            return;
          }
          // Prohibido: ArrayExpression con literales
          if (value.type === 'ArrayExpression') {
            const hasLiteral = value.elements.some(
              (el) => el && (el.type === 'Literal' || el.type === 'TemplateLiteral'),
            );
            if (hasLiteral) {
              context.report({ node: value, messageId: 'hardcoded' });
            }
          }
        }
        return {
          'CallExpression Property': checkProperty,
        };
      },
    },

    // ───────────────────────────────────────────────────────────
    // no-native-date-input
    // ───────────────────────────────────────────────────────────
    'no-native-date-input': {
      meta: {
        type: 'problem',
        docs: { description: 'Usar <DatePicker> en vez de <input type="date">' },
        schema: [],
        messages: {
          native:
            '<input type="date"> falla en Safari macOS. Usar <DatePicker> del design system.',
        },
      },
      create(context) {
        return {
          JSXOpeningElement(node) {
            if (!node.name || node.name.name !== 'input') return;
            const typeAttr = node.attributes.find(
              (a) =>
                a.type === 'JSXAttribute' &&
                a.name &&
                a.name.name === 'type' &&
                a.value &&
                a.value.type === 'Literal' &&
                ['date', 'datetime-local', 'time'].includes(a.value.value),
            );
            if (typeAttr) {
              context.report({ node: typeAttr, messageId: 'native' });
            }
          },
        };
      },
    },

    // ───────────────────────────────────────────────────────────
    // no-rhf-register-on-custom
    // ───────────────────────────────────────────────────────────
    'no-rhf-register-on-custom': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'react-hook-form register() solo en inputs nativos. Custom requiere <Controller>',
        },
        schema: [
          {
            type: 'object',
            properties: {
              customComponents: { type: 'array', items: { type: 'string' } },
            },
          },
        ],
        messages: {
          custom:
            '`register()` no funciona con {{component}} (componente custom). Usar <Controller> en lugar.',
        },
      },
      create(context) {
        const options = context.options[0] || {};
        const custom = new Set(
          options.customComponents || [
            'NumberInput',
            'DatePicker',
            'TimePicker',
            'Combobox',
            'Select',
            'Switch',
            'Checkbox',
            'RadioGroup',
            'MultiSelect',
          ],
        );
        return {
          JSXOpeningElement(node) {
            if (!node.name || !custom.has(node.name.name)) return;
            // Buscar spread {...register('x')}
            for (const attr of node.attributes) {
              if (attr.type !== 'JSXSpreadAttribute') continue;
              const arg = attr.argument;
              if (
                arg.type === 'CallExpression' &&
                arg.callee.type === 'Identifier' &&
                arg.callee.name === 'register'
              ) {
                context.report({
                  node: attr,
                  messageId: 'custom',
                  data: { component: node.name.name },
                });
              }
            }
          },
        };
      },
    },

    // ───────────────────────────────────────────────────────────
    // require-type-from-generated
    // ───────────────────────────────────────────────────────────
    // E.19 — el frontend NO debe escribir tipos a mano que pueden
    // diverger de metadata. Si declaras `interface Producto` cuando
    // existe `Producto` en `_generated.ts`, alertar.
    'require-type-from-generated': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Tipos del dominio deben importarse de _generated.ts, no declararse',
        },
        schema: [
          {
            type: 'object',
            properties: {
              dominioTipos: { type: 'array', items: { type: 'string' } },
            },
          },
        ],
        messages: {
          duplicated:
            'Existe tipo `{{name}}` en src/api/types/_generated.ts. Importar de ahí en vez de declararlo localmente.',
        },
      },
      create(context) {
        const options = context.options[0] || {};
        // Lista de tipos que están en _generated.ts (el script meta-derive-types
        // podría escribir un sidecar JSON con esta lista; aquí se hardcodea
        // por simplicidad — cada proyecto la actualiza al regenerar).
        const dominioTipos = new Set(options.dominioTipos || []);

        return {
          'TSInterfaceDeclaration, TSTypeAliasDeclaration'(node) {
            const name = node.id && node.id.name;
            if (!name) return;
            if (dominioTipos.has(name)) {
              context.report({
                node: node.id,
                messageId: 'duplicated',
                data: { name },
              });
            }
          },
        };
      },
    },
  },
};
