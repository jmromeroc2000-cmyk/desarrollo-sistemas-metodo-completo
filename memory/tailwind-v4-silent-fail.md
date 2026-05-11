---
name: Tailwind v4 ignora silenciosamente tokens no declarados en @theme
description: Una clase como bg-primary-950/40 con primary-950 indefinido NO da error de build ni warning — Tailwind simplemente omite el estilo. Solo detectable con axe en navegador o con preflight regla 4.
type: feedback
---

Tailwind v4 (CSS-first config con `@theme`) tiene una decisión de diseño
peligrosa: **clases que referencian tokens no declarados se omiten sin
warning**.

```css
/* Dev/frontend/tokens/colors.json contiene primary-50..900 pero NO primary-950 */
```

```jsx
<div className="bg-primary-950/40">  {/* ← se renderiza sin background */}
```

Resultado: el componente queda sin estilo visible. No hay error de build,
no hay warning, no hay class faltante en el DOM. La única forma de cazarlo:

- Test a11y en navegador (axe detecta contraste 0:1)
- `npm run preflight` regla 4 (lee Tailwind classes en JSX y verifica que
  cada token referenciado existe en `tokens/colors.json`)
- Inspección visual en dark mode (a veces solo falla un mode)

**How to apply:**

1. Cualquier token Tailwind nuevo: agregarlo a `Dev/frontend/tokens/colors.json`
   ANTES de usarlo en JSX. Style Dictionary genera el `@theme` desde ese JSON.
2. Correr `npm run tokens:build` después de editar `colors.json`.
3. Si una clase falla en runtime sin error, verificar primero el token.
4. Dark mode: cualquier `text-X-NNN` requiere su `dark:text-X-NNN` declarado
   en `@theme` para el modo oscuro (ver `dark-mode-contrast.md`).

**Por qué Tailwind hizo esto:** v4 optó por failure-silent vs failure-loud
para no romper builds cuando librerías de terceros usan clases que tu
proyecto no declara. Trade-off: tu propio bug también pasa desapercibido.

Regla de preflight automatizable:

```bash
# Pseudo-implementación:
grep -rEo "(text|bg|border|ring)-[a-z]+-[0-9]{2,3}" src/ \
  | sort -u \
  | while read token; do
    grep -q "\"$token\"" tokens/colors.json || echo "TOKEN MISSING: $token"
  done
```
