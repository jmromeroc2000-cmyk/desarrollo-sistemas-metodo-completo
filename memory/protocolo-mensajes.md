---
name: Protocolo de mensajes inter-agente
description: docs/messages/open + archived es el único canal. Frontmatter YAML con from/to/state/closes. Ver docs/messages/README.md.
type: reference
---

Cuando dos o más agentes trabajan en el mismo repo (backend, frontend, infra),
los mensajes entre ellos viven en `docs/messages/`:

```
docs/messages/
├── README.md          ← protocolo completo
├── open/              ← mensajes activos
└── archived/          ← respondidos/cerrados
```

**Al ABRIR sesión** (cada agente):

```bash
ls docs/messages/open/  # listar mensajes activos
```

O invocar el sub-agente `message-bus` que destila la lista a una tabla
priorizada filtrada por `to: <mi-agente>`.

**Al ENVIAR mensaje:** crear archivo en `open/` con nombre
`YYYY-MM-DD-HHmm-from-X-to-Y-tema.md` y frontmatter:

```yaml
---
from: backend
to: frontend
created: 2026-05-11T00:00:00-06:00
subject: <asunto>
closes: []
state: open
labels: [migration]
---
```

**Al RESPONDER:** crear nuevo archivo con `closes: [archivo-original.md]` y
actualizar `state: responded` del archivo original.

**Al CERRAR:** mover todos los archivos del thread a `archived/` con
`state: closed`. Pendientes generados deben estar en `docs/PENDIENTES.md`.

Detalles completos en `docs/messages/README.md` del proyecto.
