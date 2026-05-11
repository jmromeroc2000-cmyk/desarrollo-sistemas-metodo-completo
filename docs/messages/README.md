# Canal de mensajes entre agentes

Este directorio es el **único** lugar donde los agentes (backend, frontend,
infra) se comunican entre sesiones. Sustituye los `docs/3X-mensaje-*.md`
sueltos del método anterior.

## Estructura

```
docs/messages/
├── README.md          ← este archivo
├── open/              ← mensajes activos (sin respuesta o sin cerrar)
└── archived/          ← respondidos/cerrados (trazabilidad histórica)
```

## Convención de nombre

```
YYYY-MM-DD-HHmm-from-X-to-Y-tema-corto.md
```

Ejemplo: `2026-05-10-2200-from-frontend-to-backend-pendientes-post-v148.md`

- Fecha-hora local del autor (zona configurable, default es-MX).
- `from`/`to` con valores `backend`, `frontend`, `infra`, `all`.
- Tema en kebab-case, ≤40 chars.

## Frontmatter obligatorio

```yaml
---
from:    backend           # backend | frontend | infra
to:      frontend           # backend | frontend | infra | all
created: 2026-05-10T22:00:00-06:00
subject: Pendientes detectados post v1.4.8
closes:  []                 # lista de archivos que esta cierra
state:   open               # open | responded | closed
labels:  [migration, blocker]
---
```

### Campos

- **from**: agente emisor.
- **to**: agente destinatario (o `all` si aplica a todos).
- **created**: ISO 8601 con TZ.
- **subject**: línea de asunto, breve y específica.
- **closes**: array de nombres de archivo (en este mismo dir) que este mensaje
  responde/cierra. Vacío para mensajes nuevos.
- **state**:
  - `open`: el destinatario aún no respondió ni cerró.
  - `responded`: el destinatario respondió (nuevo mensaje con `closes:`)
    pero el thread no está cerrado.
  - `closed`: el thread está cerrado; el archivo debe moverse a `archived/`.
- **labels**: opcionales, libre. Sugeridos: `blocker`, `migration`, `breaking`,
  `infra`, `security`, `low-priority`.

## Workflow

### Al enviar un mensaje

1. Crear archivo en `open/` con nombre + frontmatter.
2. Cuerpo del mensaje en markdown estándar (contexto + petición/notificación).
3. Commit con `docs(messages): from <X> to <Y> — <subject>`.

### Al recibir / responder

1. Leer mensaje y atender (código, PR, etc.).
2. Crear archivo de respuesta en `open/` con `closes: [<archivo-origen.md>]`.
3. Actualizar el `state:` del archivo origen a `responded`.
4. Commit con `docs(messages): respuesta a <archivo> — <subject>`.

### Al cerrar el thread

Cuando el remitente original confirma que la respuesta resuelve el tema:

1. Editar todos los archivos del thread → `state: closed`.
2. Mover todos los archivos del thread a `archived/`.
3. Si los pendientes generaron items, ya deben estar en `docs/PENDIENTES.md`.
4. Commit con `docs(messages): cierra thread <subject>`.

## Al iniciar sesión

Cada agente al arrancar DEBE:

```bash
ls docs/messages/open/ | xargs -I {} grep -l "to: <mi-agente>\|to: all" docs/messages/open/{} 2>/dev/null
```

O invocar el sub-agente `message-bus` que destila esto a una tabla
con priorities y blocked-by.

## Reglas no negociables

- Cero mensajes inter-agente fuera de este directorio.
- Cero cambios de `state:` sin commit (la auditoría debe quedar en git log).
- Cero borrado de mensajes — solo se mueven a `archived/`.
- `closes:` debe apuntar a archivos que existen (en `open/` o `archived/`).
