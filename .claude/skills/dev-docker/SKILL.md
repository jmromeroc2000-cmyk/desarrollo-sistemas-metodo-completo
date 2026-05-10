---
name: programador-docker-contenedores
description: >
  Activar cuando el usuario pida: escribir o revisar un Dockerfile; configurar
  docker-compose para desarrollo local o CI; optimizar el tamaño de una imagen;
  resolver problemas de contenedores; diseñar una estrategia de despliegue con
  contenedores; configurar variables de entorno de forma segura en Docker;
  diseñar health checks; publicar imágenes a un registro; o cualquier tarea
  donde el empaquetado y despliegue de aplicaciones con contenedores sea
  el objetivo principal.
  Comandos de activación: /dev-docker · [MODO: DOCKER]
---

# SKILL — Contenedores y despliegue con Docker

## 1. Verificaciones obligatorias ANTES de escribir Dockerfiles

- [ ] **Lenguaje y runtime** — ¿Python, Node, Java, Go? Determina la imagen base
- [ ] **Entorno destino** — ¿desarrollo local, CI, Kubernetes, ECS, Cloud Run?
- [ ] **Tamaño objetivo** — ¿hay límites de tamaño de imagen en el registro o entorno?
- [ ] **Usuario** — ¿el contenedor debe correr como non-root? (sí, siempre en producción)
- [ ] **Secrets** — ¿cómo se inyectan variables de entorno y credenciales?
- [ ] **Healthcheck** — ¿hay endpoint de salud para el orquestador?

---

## 2. Imagen base — selección

```
CRITERIOS DE SELECCIÓN (en orden de prioridad):
  1. Oficial del lenguaje en Docker Hub o registro del proveedor cloud
  2. Variante slim o alpine para producción (menor superficie de ataque)
  3. Tag fijo con digest para reproducibilidad (no usar :latest en producción)

VARIANTES COMUNES:
  python:3.12-slim-bookworm   ← recomendada (Debian slim, sin extras)
  python:3.12-alpine          ← más pequeña, pero incompatible con algunas librerías C
  node:20-slim                ← recomendada para Node en producción
  node:20-alpine              ← más pequeña
  eclipse-temurin:21-jre-alpine ← Java solo runtime (no JDK) para producción
  golang:1.22-alpine AS build ← solo para la etapa de build (multi-stage)
  gcr.io/distroless/python3   ← mínimo absoluto, sin shell (máxima seguridad)

EVITAR:
  ✗ :latest  → no reproducible, cambia sin aviso
  ✗ ubuntu:latest / debian:latest  → imagen enorme innecesariamente
  ✗ Imágenes sin mantenimiento activo o sin firma verificada
```

---

## 3. Multi-stage build — obligatorio para producción

```dockerfile
# Etapa 1: BUILD — contiene herramientas de compilación
FROM node:20-slim AS builder
WORKDIR /app

# Copiar solo lo necesario para instalar dependencias (mejor cache)
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copiar el resto del código y compilar
COPY . .
RUN npm run build

# ─────────────────────────────────────────────

# Etapa 2: PRODUCCIÓN — imagen mínima sin herramientas de build
FROM node:20-slim AS production

# Crear usuario non-root (obligatorio en producción)
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser

WORKDIR /app

# Copiar SOLO los artefactos compilados y dependencias de producción
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules

# Cambiar al usuario non-root
USER appuser

# Documentar el puerto (no lo expone — eso lo hace docker run o compose)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# CMD con formato exec (no shell) para manejo correcto de señales
CMD ["node", "dist/index.js"]
```

**Por qué multi-stage:**
- La imagen final no contiene compiladores, git, npm, ni código fuente
- Tamaño típico: imagen con build completo ~1GB → imagen producción ~150MB
- Menor superficie de ataque

---

## 4. Mejores prácticas obligatorias en Dockerfile

```
ORDEN DE CAPAS (de menos a más cambiante → mejor uso del cache):
  1. FROM imagen base
  2. Instalar dependencias del SO (apt, apk) — cambia raramente
  3. Crear usuario non-root
  4. COPY archivos de dependencias (package.json, requirements.txt, pom.xml)
  5. RUN instalar dependencias (npm ci, pip install, mvn install)
  6. COPY el resto del código fuente — cambia frecuentemente
  7. RUN compilar / build
  8. USER, EXPOSE, HEALTHCHECK, CMD

USUARIO NON-ROOT — obligatorio en producción:
  RUN groupadd --gid 1001 appgroup && \
      useradd --uid 1001 --gid appgroup --no-create-home appuser
  USER appuser
  Razón: si hay vulnerabilidad en la app, el atacante no tiene privilegios de root

CMD vs ENTRYPOINT:
  CMD ["node", "server.js"]           ← formato exec, señales correctas
  ENTRYPOINT ["python", "-m"]         ← base fija, CMD pasa argumentos
  CMD node server.js                  ← formato shell, no pasa señales correctamente
  Usar formato EXEC siempre (array JSON, no string)

.dockerignore — obligatorio:
  .git
  node_modules
  .env
  .env.*
  dist
  coverage
  *.test.ts
  README.md
  .gitignore
  Razón: sin .dockerignore, COPY . . copia todo incluyendo node_modules
```

---

## 5. Docker Compose — configuración para desarrollo y CI

```yaml
# docker-compose.yml — desarrollo local
version: "3.9"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: builder          # usar etapa de desarrollo, no producción
    ports:
      - "3000:3000"
    volumes:
      - .:/app                 # montar código para hot reload
      - /app/node_modules      # excluir node_modules del volume mount
    environment:
      - NODE_ENV=development
    env_file:
      - .env.local             # variables locales no en el repositorio
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp_dev
      POSTGRES_USER: devuser
      POSTGRES_PASSWORD: devpassword    # solo desarrollo local
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U devuser -d myapp_dev"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s

volumes:
  postgres_data:
```

---

## 6. Variables de entorno y secrets — manejo seguro

```
JERARQUÍA DE SEGURIDAD (de menos a más seguro):

  NIVEL 1 — Variables en docker-compose.yml o Dockerfile (EVITAR para secrets):
    environment:
      DB_PASSWORD: "mi_password"    ← visible en git, en ps aux, en inspect
    → Solo para valores no sensibles: NODE_ENV, PORT, LOG_LEVEL

  NIVEL 2 — Archivo .env (no en git, solo desarrollo local):
    env_file:
      - .env.local
    → Requiere .gitignore estricto. No usar en CI/CD.

  NIVEL 3 — Variables en el entorno del host / CI (para CI/CD):
    environment:
      DB_PASSWORD: ${DB_PASSWORD}   ← viene del entorno del host
    → El valor viene de GitHub Secrets, GitLab CI vars, etc.

  NIVEL 4 — Docker Secrets o gestores externos (para producción):
    secrets:
      db_password:
        external: true
    → AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager

REGLAS:
  □ NUNCA escribir secrets en el Dockerfile (quedan en las capas de la imagen)
  □ NUNCA usar ARG para secrets (se pueden ver con docker history)
  □ .env.example SIEMPRE en el repo (con valores de ejemplo, no reales)
  □ .env y .env.local SIEMPRE en .gitignore y .dockerignore
```

---

## 7. Health checks — configuración

```
TIPOS DE HEALTH CHECK:

  HTTP (para servicios web):
    HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
      CMD curl -f http://localhost:8080/health || exit 1

  TCP (para servicios que no exponen HTTP):
    HEALTHCHECK --interval=30s --timeout=5s \
      CMD nc -z localhost 5432 || exit 1

  Comando personalizado:
    HEALTHCHECK --interval=30s \
      CMD python -c "import requests; requests.get('http://localhost:8000/health')"

PARÁMETROS RECOMENDADOS:
  --interval:     30s  (frecuencia de verificación)
  --timeout:      10s  (tiempo máximo para que responda)
  --start-period: 30s  (tiempo de gracia al iniciar — no cuenta como fallo)
  --retries:      3    (fallos consecutivos antes de marcar como unhealthy)

EL ENDPOINT /health DEBE RETORNAR:
  200 OK:  el servicio está listo para recibir tráfico
  500/503: el servicio no está listo (BD desconectada, etc.)

  Respuesta recomendada:
  {"status": "ok", "version": "1.2.3", "db": "connected"}
```

---

## 8. Optimización de tamaño de imagen

```
TÉCNICAS EN ORDEN DE IMPACTO:

  1. Multi-stage build (mayor impacto — ver sección 3)
     Antes: ~800MB  →  Después: ~100-200MB

  2. Limpiar cache del gestor de paquetes en la misma capa RUN:
     RUN apt-get update && apt-get install -y curl && \
         rm -rf /var/lib/apt/lists/*
     (NO en una capa RUN separada — el cache ya está en la capa anterior)

  3. Usar imagen base slim o alpine:
     python:3.12           → ~1.0 GB
     python:3.12-slim      → ~130 MB
     python:3.12-alpine    → ~50 MB

  4. No instalar paquetes de desarrollo en imagen de producción:
     pip install --no-cache-dir -r requirements.txt
     npm ci --only=production

  5. Usar .dockerignore para excluir archivos innecesarios del contexto

VERIFICAR TAMAÑO:
  docker images nombre-imagen
  docker history nombre-imagen  (ver capas y su tamaño)
  dive nombre-imagen            (herramienta: github.com/wagoodman/dive)
```

---

## 9. Formato de entrega obligatorio

```
### [Dockerfile]
\`\`\`dockerfile
# Dockerfile comentado con justificación de cada decisión no obvia
\`\`\`

### [.dockerignore]
Lista de exclusiones y justificación.

### [docker-compose.yml]  ← si aplica
Configuración para desarrollo local con servicios dependientes.

### [Variables de entorno]
Lista de variables requeridas con descripción.
Archivo .env.example con valores de ejemplo (nunca reales).

### [Comandos de referencia]
Cómo construir, ejecutar y depurar la imagen.
  docker build -t nombre:tag .
  docker run -p 3000:3000 --env-file .env.local nombre:tag
  docker compose up --build

### [Verificación de tamaño y capas]
Tamaño de la imagen resultante.
Capas más pesadas identificadas.

### [Advertencias]
Limitaciones, configuración pendiente para producción, deuda técnica.

### [Referencias]  ← APA 7, más reciente → más antigua
```

---

## 10. Modos globales — configuración en contenedores

```
SYSTEM_MODE se pasa como variable de entorno al contenedor:

  docker-compose.yml por entorno:

  # Desarrollo → DEBUG
  services:
    app:
      environment:
        SYSTEM_MODE: DEBUG
        MAINTENANCE_OUTPUT_PATH: /app/mantenimiento

  # Producción → PERFORMANCE
  services:
    app:
      environment:
        SYSTEM_MODE: PERFORMANCE

  # Ventana de mantenimiento → MAINTENANCE
  services:
    app:
      environment:
        SYSTEM_MODE: MAINTENANCE
        MAINTENANCE_OUTPUT_PATH: /var/sistema/mantenimiento

VOLUMEN OBLIGATORIO EN MODO MANTENIMIENTO:
  El directorio de mantenimiento debe ser un volumen persistente
  para que los scripts generados sobrevivan al reinicio del contenedor:

  services:
    app:
      volumes:
        - mantenimiento_data:/var/sistema/mantenimiento
  volumes:
    mantenimiento_data:

HEALTH CHECK SENSIBLE AL MODO:
  El endpoint /health debe indicar el modo activo:
  {
    "status": "ok",
    "mode": "PERFORMANCE",    ← modo activo
    "version": "1.2.3"
  }
  En modo MAINTENANCE retornar también:
  {
    "status": "maintenance",
    "mode": "MAINTENANCE",
    "pending_scripts": 3       ← scripts generados pendientes de aplicar
  }

RESTRICCIÓN:
  ✗ No hardcodear SYSTEM_MODE en el Dockerfile — siempre en docker-compose
    o en el sistema de gestión de secretos del entorno
```

---

## 11. Restricciones

```
✗ No usar :latest como tag en producción
✗ No correr contenedores como root en producción
✗ No escribir secrets en el Dockerfile ni en ARG
✗ No usar CMD en formato shell (string) — siempre formato exec (array)
✗ No omitir .dockerignore — sin él, el contexto incluye node_modules, .git, etc.
✗ No instalar herramientas de debug en imágenes de producción
✗ No ignorar los health checks en servicios que van a un orquestador
✗ No hacer RUN apt-get update en una capa separada del apt-get install
    (el cache de la capa anterior queda obsoleto en builds futuros)
```

---

## 12. Referencias del dominio (APA 7)

Docker, Inc. (2024). *Dockerfile best practices*.
    https://docs.docker.com/build/building/best-practices/

Docker, Inc. (2024). *Docker compose specification*.
    https://docs.docker.com/compose/compose-file/

National Institute of Standards and Technology. (2017).
    *Application container security guide* (NIST SP 800-190).
    https://doi.org/10.6028/NIST.SP.800-190
