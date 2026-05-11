# Canal de mensajes entre agentes — protocolo append-only

> v2.0.0 — Diciembre 2026. Reemplaza el protocolo v1.1.0 que tenía
> `state:` mutable (causaba merge conflicts entre agentes en paralelo).

Único lugar donde los agentes (backend, frontend, infra) se comunican
entre sesiones.

## Principio fundamental

**Los mensajes son inmutables después de creados.** El estado del thread
se **deriva** de la existencia de respuestas, no de un campo mutable que
dos agentes intentarían escribir en paralelo.

```
sin respuesta                → open
≥1 respuesta sin `closes:`   → replied
respuesta con `closes:`      → closed → mover thread a archived/
```

## Estructura

```
docs/messages/
├── README.md          ← este archivo
├── open/              ← mensajes activos
└── archived/          ← threads cerrados
```

## Convención de nombre

```
YYYY-MM-DD-HHmm-from-X-to-Y-tema-corto.md
```

Ejemplo: `2026-05-11-1500-from-frontend-to-backend-revision-metodo.md`

- Fecha-hora local del autor (zona configurable, default es-MX).
- `from`/`to` con valores `backend`, `frontend`, `infra`, `all`.
- Tema en kebab-case, ≤40 chars.

## Frontmatter por tipo de mensaje

### Mensaje original (sin in_reply_to)

```yaml
---
from:    backend           # backend | frontend | infra
to:      frontend           # backend | frontend | infra | all
created: 2026-05-11T22:00:00-06:00
subject: <asunto>
labels:  [migration, blocker]   # opcional
---
```

### Mensaje de respuesta

```yaml
---
from:        frontend
to:          backend
created:     2026-05-11T15:00:00-06:00
subject:     Re: <asunto original>
in_reply_to: 2026-05-11-from-backend-to-frontend-X.md
closes:      []              # vacío si solo responde, lista si cierra el thread
labels:      [...]
---
```

### Cierre de thread

Cuando el remitente original confirma que todo está resuelto, agrega un
mensaje final con `closes` apuntando al thread entero:

```yaml
---
from:        backend
to:          frontend
created:     2026-05-11T18:00:00-06:00
subject:     Cierre confirmado — <asunto>
in_reply_to: <último mensaje del thread>
closes:      [<original>, <respuesta-1>, <respuesta-2>, ...]
---
```

## Campos del frontmatter

- **from**: agente emisor.
- **to**: agente destinatario (o `all`).
- **created**: ISO 8601 con TZ.
- **subject**: breve y específico.
- **in_reply_to**: archivo del mensaje al que responde (omitir si es nuevo thread).
- **closes**: lista de archivos del thread que este mensaje cierra. Vacío
  o ausente si el thread sigue abierto.
- **labels**: opcionales. Sugeridos: `blocker`, `migration`, `breaking`,
  `infra`, `security`, `low-priority`, `review`, `method`, `multi-agent`.

## Estado derivado (sin escritura)

El sub-agente `message-bus` calcula `state` para cada thread leyendo el
grafo de `in_reply_to`/`closes`:

```
function deriveState(thread) {
  const lastMessage = thread.messages[thread.messages.length - 1];
  if (lastMessage.closes && lastMessage.closes.length > 0) return 'closed';
  if (thread.messages.length > 1) return 'replied';
  return 'open';
}
```

## Workflow

### Al enviar mensaje nuevo (inicia thread)

1. Crear archivo en `open/` con nombre + frontmatter sin `in_reply_to`.
2. Commit: `docs(messages): from <X> to <Y> — <subject>`.

### Al responder

1. Crear NUEVO archivo en `open/` con `in_reply_to: <archivo-original>`.
2. **No editar el archivo original.** No tocar nada de su contenido.
3. Si tu respuesta resuelve el tema (sin requerir más ida-vuelta), agregar
   `closes: [<original>]`.
4. Commit: `docs(messages): re <archivo-original> — <subject>`.

### Al cerrar thread sin respuesta final adicional

Si la respuesta más reciente del otro agente ya cerró el tema y solo
quieres archivar:

1. Crear mensaje final tipo "Cierre confirmado" con `closes: [...]`.
2. Mover TODOS los archivos del thread a `archived/`.
3. Commit: `docs(messages): cierra thread <subject>`.

### Al iniciar sesión (CADA AGENTE)

```bash
# Manual:
ls docs/messages/open/

# Automatizado (recomendado): invocar sub-agente message-bus
# desde Claude Code: "destila mis mensajes abiertos"
```

El sub-agente devuelve tabla priorizada filtrada por `to: <mi-agente>` o
`to: all`.

## Reglas no negociables

- Cero mensajes inter-agente fuera de este directorio.
- **Cero edición de mensajes ya creados** (append-only).
- Cero borrado — solo mover a `archived/`.
- `in_reply_to` y `closes` deben apuntar a archivos que existen (en `open/` o `archived/`).
- Cada mensaje requiere `git push` antes de cerrar sesión. Un mensaje
  en working tree local no es visible al otro agente.

## Verificación estructural

`message-bus --strict` (invocado en CI o manualmente) valida:

- Todo archivo en `open/`/`archived/` tiene frontmatter válido.
- `in_reply_to` apunta a archivo existente **en este repo**.
- `closes` apunta a archivos existentes **en este repo**.
- Threads `closed` están realmente en `archived/`.
- No hay archivos en `archived/` que aún tengan respuestas pendientes.

Exit code 1 si hay cualquier anomalía.

### Cross-repo references

Si dos agentes trabajan en repos distintos (ej: el método base vs un
sistema construido con el método), los `in_reply_to`/`closes` pueden
apuntar a archivos del OTRO repo. El validador local marca como
anomalía porque no encuentra el archivo localmente, pero es esperado.

**Recomendaciones**:

- Para casos cross-repo: usar prefix `external:` en el valor para
  documentar que es referencia cross-repo (parser ignora):
  ```yaml
  closes: ['external:sistema-inventarios#docs/messages/...md']
  ```
- O en repos nuevos sin historial cross-repo, mantener `closes:` siempre
  local — el validador `--strict` pasa limpio.
