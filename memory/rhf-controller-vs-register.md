---
name: react-hook-form — Controller para custom inputs, register() solo para nativos
description: register() asume HTMLInputElement con onChange estándar. Componentes custom (NumberInput, Combobox, Select, Checkbox, Switch, DatePicker) requieren <Controller>. ESLint rule sistemainv-ui/no-rhf-register-on-custom enforce.
type: feedback
---

`react-hook-form`'s `register()` funciona registrando un ref + listener
de `onChange` sobre el elemento DOM. Asume:

- Elemento es un `<input>` o `<textarea>` o `<select>` nativo.
- Tiene `onChange` que dispatch un event con `event.target.value`.
- El value es directamente accesible vía `ref.current.value`.

**Custom components no cumplen estos contratos:**

- `<NumberInput>` formatea (es-MX: 1,234.56) — su value interno es número,
  no string.
- `<Combobox>` (Radix) — manejo de estado custom.
- `<Select>` de Radix — no usa onChange nativo.
- `<Checkbox>` Radix — emite `onCheckedChange`, no `onChange`.
- `<Switch>` Radix — idem.
- `<DatePicker>` — emite Date objects, no strings.

Si usas `register()` en estos, react-hook-form NO recibe los cambios y
el formulario queda con valores stale.

**How to apply:**

`<Controller>` envuelve y maneja la interop:

```jsx
import { Controller } from 'react-hook-form';

// CORRECTO
<Controller
  name="cantidad"
  control={control}
  rules={{ required: 'Requerido', min: 0 }}
  render={({ field, fieldState }) => (
    <NumberInput
      {...field}                  // field.value, field.onChange, field.onBlur, field.ref
      error={fieldState.error?.message}
    />
  )}
/>

// CORRECTO para checkboxes/switches Radix
<Controller
  name="activo"
  control={control}
  render={({ field }) => (
    <Switch
      checked={field.value}
      onCheckedChange={field.onChange}
    />
  )}
/>

// INCORRECTO — register() en custom:
<NumberInput {...register('cantidad')} />  ← no funciona
<Switch {...register('activo')} />          ← no funciona
```

**Reglas:**

1. `register()` se permite SOLO en `<Input>`, `<Textarea>` y `<select>`
   nativos del design system.
2. Cualquier otro componente del DS usa `<Controller>`.
3. ESLint rule `sistemainv-ui/no-rhf-register-on-custom` lints:
   ```jsx
   <NumberInput {...register('x')} />  ← ESLint error
   ```
4. Cuando agregues componente nuevo al DS: documentar en su README si
   acepta `register()` o requiere `<Controller>`.

**Detalle técnico:** algunos componentes custom (típicamente wrappers
delgados sobre `<input>`) podrían soportar `register()` si pasas el ref
con `forwardRef` y no transforman el value. Pero la regla por defecto es
"si no es 100% input nativo → Controller". Más seguro, menos bugs.
