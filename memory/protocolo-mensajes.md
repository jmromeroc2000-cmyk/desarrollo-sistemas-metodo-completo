---
name: Protocolo de mensajes inter-agente — append-only
description: docs/messages/{open,archived}/ con frontmatter YAML. Mensajes son inmutables; estado del thread se deriva de in_reply_to y closes. Cero merge conflicts.
type: reference
---

Cuando dos o más agentes trabajan en el mismo repo (backend, frontend,
infra), los mensajes entre ellos viven en `docs/messages/`:

```
docs/messages/
├── README.md          ← protocolo completo
├── open/              ← mensajes activos
└── archived/          ← threads cerrados
```

**Principio fundamental (v2.0.0):** los mensajes son **append-only**. No
se edita ningún archivo después de creado. El estado del thread se deriva
del grafo de `in_reply_to`/`closes`. Esto elimina merge conflicts cuando
dos agentes responden en paralelo.

**Al ABRIR sesión** (cada agente):

```bash
ls docs/messages/open/  # listar mensajes activos
```

O invocar `message-bus` que destila por agente, calcula estado y prioriza.

**Al ENVIAR mensaje nuevo:**

```yaml
---
from: backend
to:   frontend
created: 2026-05-11T00:00:00-06:00
subject: <asunto>
labels: [migration]
---
```

**Al RESPONDER:** crear NUEVO archivo con `in_reply_to:` apuntando al
mensaje origen. NO editar el origen.

```yaml
---
from: frontend
to:   backend
created: 2026-05-11T03:00:00-06:00
subject: Re: <asunto>
in_reply_to: 2026-05-11-from-backend-...md
labels: [...]
---
```

**Al CERRAR thread:** mensaje final con `closes: [archivo1, archivo2, ...]`.
Después de commitear, mover TODOS los archivos del thread a `archived/`.

**Estado derivado (calcula `message-bus`):**

- sin respuesta → `open`
- ≥1 respuesta sin `closes:` → `replied`
- respuesta con `closes:` → `closed` → mover a `archived/`

**Validación estructural:** `node scripts/message-bus-validate.js --strict`
verifica:
- frontmatter válido
- `in_reply_to` apunta a archivo existente
- `closes` apunta a archivos existentes
- threads cerrados están en archived/

CI corre con `--strict` y falla el job si hay anomalías.

Detalles completos en `docs/messages/README.md`.
