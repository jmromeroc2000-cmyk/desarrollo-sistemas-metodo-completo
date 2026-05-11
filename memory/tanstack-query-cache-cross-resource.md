---
name: TanStack Query — cuando una mutation afecta vista de OTRO recurso, invalidar ambos
description: Renombrar una categoría afecta la columna "Categoría" de productos. Sin invalidateQueries({ queryKey: queryKeys.productos.all }) además del propio, la vista queda stale hasta refresh manual.
type: feedback
---

Bug clásico de cache invalidation: una mutation cambia el recurso A, pero
la vista de recurso B muestra una proyección de A (relación FK). Si el
`onSuccess` solo invalida A, la vista B queda con datos stale.

**Ejemplo real (SistemaINV):**

```ts
// Renombrar una categoría
const renameCategory = useMutation({
  mutationFn: (data) => api.categorias.update(id, data),
  onSuccess: () => {
    // INCORRECTO — solo invalida categorias
    queryClient.invalidateQueries({ queryKey: queryKeys.categorias.all });
  },
});
```

Resultado: la pantalla `/categorias` se refresca (muestra el nombre nuevo).
Pero la pantalla `/productos` sigue mostrando el nombre VIEJO en su columna
"Categoría" porque su useQuery no se invalidó.

**How to apply:**

```ts
// CORRECTO — invalidar todos los recursos que proyectan
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.categorias.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.productos.all });  // ← clave
  queryClient.invalidateQueries({ queryKey: queryKeys.ordenesCompra.all });  // si aplica
},
```

**Regla:** para cada mutation que toca `<RecursoA>`, listar los recursos
que tienen FK hacia `<RecursoA>` o proyectan campos de él. Invalidar TODOS.

**Lista típica de "recursos afectados por X":**

- Categoría afectada → productos
- Unidad de medida afectada → productos
- Proveedor afectado → productos, órdenes de compra, entradas
- Almacén afectado → ubicaciones, inventario, movimientos
- Producto afectado → inventario, entradas/salidas/órdenes (detalles)
- Rol afectado → usuarios, sesiones (refresh tokens)

**Automatización posible (futuro):**

`campos_sistema.tipo_validacion='CATALOGO'` + `tabla_referencia` indica
relaciones FK. Un helper podría leer la metadata y generar el árbol de
invalidación automáticamente:

```ts
// Pseudo-API:
invalidateRelated('categorias', queryClient);
// → invalida categorias.all + productos.all (porque productos.categoria_id FK)
```

Por ahora se hace a mano basado en conocimiento del dominio. Test
explícito: cada mutation debe tener test que verifica las
`invalidateQueries` esperadas.

**Excepción:** si el campo proyectado es ID puro (no nombre), no requiere
invalidación porque IDs son inmutables. Solo cuando se proyecta `nombre`,
`descripcion`, etc. que sí cambian.
