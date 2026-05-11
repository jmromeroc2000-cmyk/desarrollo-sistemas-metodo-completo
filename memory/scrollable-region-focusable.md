---
name: Contenedores overflow-x-auto requieren role="region" + tabIndex={0} para a11y
description: axe rule scrollable-region-focusable falla si un contenedor scrolleable horizontal no es keyboard-accessible. ESLint rule jsx-a11y/no-noninteractive-tabindex muerde, requiere eslint-disable inline justificado.
type: feedback
---

axe accessibility rule: **`scrollable-region-focusable`**. Cualquier
contenedor con `overflow-x-auto` o `overflow-y-auto` que pueda scrollearse
debe ser **keyboard-accessible** — un usuario que navega solo con teclado
debe poder hacer focus al contenedor para usar `←/→/↑/↓` y scrollear.

Caso típico: tabla con muchas columnas en mobile. En desktop la tabla cabe;
en mobile overflow-x. Sin `tabIndex={0}`, navegación keyboard no puede
ver las columnas a la derecha.

```jsx
// INCORRECTO — falla axe en mobile
<div className="overflow-x-auto">
  <table>...</table>
</div>

// CORRECTO
<div
  role="region"
  aria-label="Tabla de productos"
  tabIndex={0}
  className="overflow-x-auto focus-visible:ring-2 focus-visible:ring-primary-500"
>
  <table>...</table>
</div>
```

**How to apply:**

1. Cualquier `overflow-x-auto` o `overflow-y-auto` que en algún viewport
   puede scrollearse: agregar `role="region"`, `aria-label` y `tabIndex={0}`.

2. **ESLint conflict**: la rule `jsx-a11y/no-noninteractive-tabindex`
   protesta porque `<div>` no es interactivo. Justificar con disable inline:
   ```jsx
   {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
   <div role="region" tabIndex={0} className="overflow-x-auto" ...>
   ```
   Documentar la razón (WCAG scrollable-region-focusable lo pide).

3. **Componente `<Table>` del DS** del proyecto debe envolver
   automáticamente con este patrón. PR #27 de SistemaINV lo aplicó al
   wrapper genérico, no per-página.

4. Estilo de focus visible obligatorio:
   ```jsx
   focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none
   ```
   Sin esto, usuario keyboard no sabe dónde está el focus.

5. **Test e2e mobile**: el axe-run en viewport mobile (test:a11y con
   `--project=mobile-chrome`) debe pasar. Si falla, la aria no es opcional.

**Cobertura más amplia:** mismo patrón aplica a `<pre>` con código largo,
`<textarea>` con overflow, modales con contenido alto. Cualquier elemento
scrolleable debe ser focusable o tener un hijo focusable que controle el scroll.

**Per qué ESLint y axe están en desacuerdo:** ESLint protege contra
tab-stops innecesarios que confunden screen readers. axe protege contra
contenido inaccesible. Ambos tienen razón en sus dominios; el caso de
contenedor scrolleable requiere disable explícito porque axe gana.
