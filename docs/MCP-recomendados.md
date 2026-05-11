# MCP servers recomendados para sistemas con este método

> Los MCPs (Model Context Protocol servers) extienden Claude Code con
> herramientas externas. Algunos son obvios; documentar cuáles encajan
> con el método ahorra trabajo al onboardear.

## Para CUALQUIER proyecto del método

| MCP | Propósito | Comando install |
|-----|-----------|-----------------|
| **filesystem** | Acceso enriquecido a archivos locales | `claude mcp add filesystem` |
| **github** | PRs, issues, releases vía gh tool | `claude mcp add github` |

## Para proyectos con PostgreSQL (default del método)

| MCP | Propósito | Cuándo |
|-----|-----------|--------|
| **postgres** | Queries ad-hoc en BD desde Claude (SELECT readonly) | Útil para `/diff-meta` profundo o auditoría |

Comando:
```bash
claude mcp add postgres --connection-string="$DB_URL"
```

⚠️ **Configurar con usuario READ-ONLY**. NUNCA con el usuario que tiene
permisos de schema. El método declara que mutaciones a metadata SOLO van
por migración — el MCP no debe permitir bypassear.

## Para CI/CD avanzado

| MCP | Propósito |
|-----|-----------|
| **slack** (si el equipo usa) | Notificaciones de status/handoffs |
| **sentry** (si se adopta E.7) | Inspección de errores client-side |

## Cómo se relaciona con el método

Los MCPs son **opcionales**. El método funciona 100% sin ellos. Su valor:

- `filesystem` MCP es más eficiente que `Read`/`Write` directos para
  exploración profunda.
- `github` MCP evita salir a `gh` CLI cada vez.
- `postgres` MCP permite "qué hay en `campos_sistema` ahora mismo" sin
  abrir otra terminal.

**Reglas para agregar más MCPs**:

1. Solo si resuelve un dolor real y recurrente.
2. Documentar en este archivo.
3. Si el MCP necesita secrets, seguir §13.3b del CLAUDE.md (no en repo,
   en config local cifrada).
4. Si el MCP da acceso de escritura: deshabilitar mutación o usar
   usuario read-only (especialmente postgres).
