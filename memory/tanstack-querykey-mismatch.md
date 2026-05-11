---
name: TanStack Query — queryKey de useQuery vs invalidateQueries debe coincidir EXACTO
description: useQuery({queryKey:['unidades']}) vs invalidateQueries({queryKey:['unidades-medida']}) = "crear funciona, la lista no refresca". NO tira error, solo UX rota.
type: feedback
---

Bug típico de TanStack Query: la mutation hace `invalidateQueries` con un
key string distinto al que usa el `useQuery` de la lista. **Resultado:
crear funciona, la lista no se refresca**. El bug NO tira error — solo
UX rota.

```js
// Lista
useQuery({ queryKey: ['unidades'], queryFn: fetchUnidades });

// Mutation
useMutation({
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['unidades-medida'] })
  //                                                            ^^^^^^^^^^^^^^^^^
  //                                                            string distinto
});
```

La diferencia (`'unidades'` vs `'unidades-medida'`) es un typo común que
pasa cuando renombras un endpoint y olvidas actualizar todos los keys.

**How to apply:**

1. NUNCA usar strings hardcoded para queryKey. Centralizar en factory:

```ts
// Dev/frontend/src/queries/keys.ts
export const queryKeys = {
  unidadesMedida: {
    all:     ['unidadesMedida'] as const,
    list:    (filters?: Filters) => ['unidadesMedida', 'list', filters] as const,
    detail:  (id: string) => ['unidadesMedida', 'detail', id] as const,
  },
  // ...
};

// Lista
useQuery({ queryKey: queryKeys.unidadesMedida.list(), ... });

// Mutation
queryClient.invalidateQueries({ queryKey: queryKeys.unidadesMedida.all });
```

2. ESLint rule custom `sistemainv-ui/no-hardcoded-querykey` bloquea
   strings inline en `queryKey:` (lints en build).

3. Si renombras un recurso, cambias el factory; TypeScript te muestra
   todos los callers automáticamente.

4. **Tests**: cuando agregas mutation, verifica explícitamente:
   ```js
   expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
     expect.objectContaining({ queryKey: queryKeys.unidadesMedida.all })
   );
   ```

**Variante peligrosa — invalidación cross-recurso:**

Si un mutation cambia recurso A pero afecta proyección en vista de recurso
B (ej: renombrar categoría afecta columna "Categoría" de productos):

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.categorias.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.productos.all });  // ← clave
}
```

Sin la segunda invalidación, la columna queda con el nombre viejo hasta
refresh manual. Frontend DoD §5.1.1.D ya lo menciona.
