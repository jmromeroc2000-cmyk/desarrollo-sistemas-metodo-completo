---
name: <input type="date"> no abre calendario en Safari macOS
description: Safari ignora type="date" en algunos contextos (popovers, modales). Solución: componente <DatePicker> propio con popover navegable. ESLint rule sistemainv-ui/no-native-date-input enforce.
type: feedback
---

Safari macOS (Safari 16+ y otros casos) **no abre el calendario nativo**
al hacer click en `<input type="date">` dentro de ciertos contenedores
(popovers, modales, drawers). El input se ve como text input plano, sin
selector visual. Usuario tiene que tipear `2026-05-11` a mano.

Chrome/Firefox abren el calendario sin problema. Safari mobile (iOS) sí
lo hace; Safari macOS NO.

**How to apply:**

1. **Nunca usar `<input type="date">` nativo** en el frontend. Usar siempre
   el componente `<DatePicker>` del design system propio que:
   - Renderiza un popover con calendario navegable.
   - Maneja focus/blur correctamente.
   - Funciona en TODOS los browsers.
   - Soporta formato es-MX (DD/MM/AAAA visual, ISO 8601 internamente).

2. ESLint rule `sistemainv-ui/no-native-date-input` bloquea:
   ```jsx
   <input type="date" />  ← ESLint error
   ```

3. En react-hook-form: SIEMPRE con `<Controller>` (no `register()` directo):
   ```jsx
   <Controller
     name="fecha"
     control={control}
     render={({ field }) => <DatePicker {...field} />}
   />
   ```

4. Los campos `tipo_dato=FECHA` o `FECHA_HORA` en `campos_sistema` se
   mapean automáticamente a `<DatePicker>` en `<Field>` — el preflight
   verifica que no hay native date inputs en JSX.

**Por qué Safari hace esto:** decisión histórica de Apple de no mostrar
controles nativos OS-level dentro de elementos custom. No hay forma de
forzarlo. Solución: componente propio.

**Bonus:** lo mismo aplica parcialmente a `<input type="time">` y
`<input type="datetime-local">`. Usar `<TimePicker>` y `<DateTimePicker>`
del design system.
