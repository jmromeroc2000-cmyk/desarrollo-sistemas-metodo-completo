---
name: Dark mode requiere variantes dark: explícitas — light mode pasa WCAG, dark NO
description: text-neutral-NNN funciona en light. En dark hereda el mismo color y rompe contraste. Toda clase de color necesita su par dark: en la misma string. axe lo detecta solo en dark mode con axe-color-contrast-enhanced.
type: feedback
---

Tailwind dark mode (`class` strategy) NO invierte automáticamente colores.
Tienes que declarar **explícitamente** la variante `dark:` para cada
clase relevante.

```jsx
// INCORRECTO — texto invisible en dark mode
<p className="text-neutral-800">Texto</p>

// CORRECTO — par explícito
<p className="text-neutral-800 dark:text-neutral-200">Texto</p>
```

Light mode: `neutral-800` sobre fondo `white` da contraste 12.6:1 ✓
Dark mode: `neutral-800` sobre fondo `neutral-900` da contraste 1.3:1 ✗ (texto invisible)

**Por qué pasa silenciosamente:**

- Tailwind no warning si falta variante dark.
- Build pasa.
- Test unit pasa (no renderiza dark).
- axe en CI default pasa (corre sobre light por default).
- Solo se cacha si:
  - Test e2e ejecuta toggle dark mode + axe.
  - Inspección visual en navegador real en dark.

**How to apply:**

1. Toda clase `text-*-NNN`, `bg-*-NNN`, `border-*-NNN`, `ring-*-NNN`
   debe tener su pareja `dark:`. Sin excepción.

2. **Preflight regla 5**: lints JSX y reporta clases de color sin variante
   dark:
   ```bash
   # Pseudocódigo:
   for class in $(extract-color-classes JSX); do
     if class doesn't have "dark:$class" sibling: error
   done
   ```

3. **E2E a11y obligatorio en CI** corre 2 pasadas:
   - Light mode → axe
   - Toggle dark mode → axe (nueva pasada)

4. Si una clase es **intencionalmente** invariante en ambos modos (ej:
   color de marca primary que sirve igual en ambos), justificar con
   comentario:
   ```jsx
   {/* primary-600 es color de marca; mismo en light/dark por decisión */}
   <Button className="bg-primary-600 text-white">...</Button>
   ```

5. **Tokens semánticos** (recomendado): en lugar de `text-neutral-800`
   directo, usar tokens semánticos que YA cambian con dark mode:
   ```jsx
   <p className="text-default">     {/* token mapea a neutral-800 / dark:neutral-200 */}
   ```
   Esto requiere extender `tokens/colors.json` con tokens semánticos.

**Bonus — tokens con alpha (`text-current/70`):**

`text-current/70` aplica 70% opacity al color heredado. Da contraste
**siempre menor** que el color base. Si base es 7:1 → con `/70` es ~4:1
(borderline AA fail). Evitar `/70` para texto crítico; usar token con
opacidad explícita en el `@theme`.

PR #25 de SistemaINV cazó este patrón en el componente de avisos
LOGIN_DASHBOARD.
