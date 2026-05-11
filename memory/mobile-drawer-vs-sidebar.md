---
name: Sidebar desktop = Sheet drawer en mobile — tests E2E no pueden buscar links del sidebar directo
description: El sidebar de navegación vive en un Sheet cerrado por default en viewport mobile. Tests que clickean "Inicio" del sidebar fallan en mobile-chrome con :not visible. Solución: aserts en H1 del page o abrir el drawer explícito.
type: feedback
---

Patrón estándar del design system: sidebar de navegación en desktop, drawer
(Sheet) en mobile. El drawer está **cerrado por default** en viewport
mobile; abrirlo requiere click al botón hamburger.

```
viewport ≥ 768px (md):  <Sidebar>  siempre visible
viewport < 768px:       <Sheet>    cerrado por default, ☰ button para abrir
```

Esto causa fallas E2E sutiles: un test en `chromium` (viewport desktop)
pasa porque el link `Inicio` está visible. El mismo test en `mobile-chrome`
falla con `element :not visible` porque el drawer está cerrado.

**How to apply:**

1. **Tests E2E que validan navegación** no deben buscar links del sidebar
   directo. Prefer:

   ```js
   // INCORRECTO — falla en mobile-chrome
   await page.click('a:has-text("Inicio")');
   await expect(page.locator('h1')).toContainText('Bienvenida');

   // CORRECTO — assert en algo que SIEMPRE se ve
   await page.goto('/dashboard');
   await expect(page.getByRole('heading', { level: 1 }))
     .toContainText('Bienvenida');
   ```

2. Si el test específicamente prueba la navegación desde sidebar:

   ```js
   // CORRECTO — abrir drawer explícito antes
   const viewport = page.viewportSize();
   if (viewport.width < 768) {
     await page.getByRole('button', { name: /menú|menu/i }).click();
     await page.waitFor(() => page.locator('[data-state="open"]')).then(() => {});
   }
   await page.getByRole('link', { name: 'Inicio' }).click();
   ```

3. **Helper común** en `e2e/helpers/nav.ts`:

   ```ts
   export async function navigateTo(page, linkName) {
     const viewport = page.viewportSize();
     if (viewport && viewport.width < 768) {
       await page.getByRole('button', { name: /menú|menu/i }).click();
     }
     await page.getByRole('link', { name: linkName }).click();
   }
   ```

4. **Test multi-viewport en CI** (matrix con chromium + mobile-chrome) es
   la red que detecta esto. Sin mobile-chrome, los tests "pasan" pero un
   usuario móvil real no puede usar la app — PR #27 SistemaINV cazó esto.

**Variantes del mismo problema:**

- Columnas con `hidden md:table-cell` no son visibles en mobile. Tests
  que assert texto en esa columna fallan. Soluciones:
  - Re-abrir modal de edición y verificar input value.
  - Usar selector más específico (no la tabla).
- Tooltips activados por hover en desktop no existen en mobile (touch).
  Tests que dependen de tooltip deben usar long-press o trigger manual.

**Decisión arquitectónica:** ¿agregar mobile-chrome a CI default o solo
nightly? El método declara **multi-browser obligatorio en PRs** (no
nightly) porque los bugs mobile son 100% reproducibles, no flakies.
