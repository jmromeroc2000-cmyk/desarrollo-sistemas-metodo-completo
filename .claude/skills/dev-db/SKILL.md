---
name: programador-bases-de-datos
description: >
  Activar cuando el usuario pida: diseñar o revisar un modelo de base de datos
  relacional o NoSQL; normalizar o desnormalizar tablas; diseñar índices;
  escribir o revisar queries SQL complejas; diseñar estrategias de migración;
  resolver problemas de rendimiento en consultas; diseñar transacciones;
  evaluar qué tipo de base de datos usar; configurar connection pooling;
  o cualquier tarea donde el diseño, consulta o administración de datos
  persistentes sea el objetivo principal.
  Comandos de activación: /dev-db · [MODO: BASE DE DATOS]
---

# SKILL — Diseño y acceso a bases de datos

## 1. Verificaciones obligatorias ANTES de diseñar o consultar

- [ ] **Tipo de BD** — ¿relacional (PostgreSQL, MySQL, SQLite), documento (MongoDB), clave-valor (Redis), columnar (Cassandra), grafo (Neo4j)?
- [ ] **Volumen esperado** — ¿filas actuales y proyección a 1-3 años?
- [ ] **Patrones de acceso** — ¿más lecturas o escrituras? ¿queries analíticas o transaccionales?
- [ ] **Consistencia requerida** — ¿ACID obligatorio o eventual consistency es aceptable?
- [ ] **ORM o queries directas** — ¿hay ORM en uso? ¿restricciones de tecnología?
- [ ] **Entorno** — ¿desarrollo local, cloud managed (RDS, Cloud SQL, Atlas) o self-hosted?

---

## 2. Elección del tipo de base de datos

| Tipo | Cuándo usar | Ejemplos | Cuándo NO usar |
|------|-------------|----------|----------------|
| **Relacional** | Datos estructurados, relaciones complejas, ACID obligatorio, reportes | PostgreSQL, MySQL | Datos no estructurados, escala masiva de escrituras |
| **Documento** | Datos semiestructurados, esquema variable, jerarquías anidadas | MongoDB, Firestore | Relaciones complejas entre entidades, transacciones multi-documento frecuentes |
| **Clave-valor** | Cache, sesiones, contadores, datos de acceso ultra-rápido | Redis, DynamoDB | Queries complejas, datos relacionales |
| **Columnar** | Series de tiempo, analítica, IoT, logs de alta escritura | Cassandra, ScyllaDB | Transacciones ACID, relaciones muchos-a-muchos |
| **Grafo** | Relaciones complejas entre entidades (redes sociales, recomendaciones) | Neo4j, Amazon Neptune | Datos sin relaciones complejas |
| **Búsqueda** | Full-text search, faceting, autocomplete | Elasticsearch, Typesense | Fuente de verdad primaria |

**Regla:** La base de datos relacional es el default. Usar otro tipo solo cuando hay una razón técnica documentada.

---

## 3. Tipos de datos — estándar SQL-92 portable

> **Principio rector:** Usar exclusivamente tipos del núcleo del estándar SQL-92
> (ISO/IEC 9075:1992). Esto garantiza portabilidad entre motores relacionales
> (PostgreSQL, MySQL/MariaDB, SQL Server, Oracle, SQLite, DB2) sin dependencias
> de extensiones propietarias.

### 3.1 Tipos permitidos (núcleo SQL-92)

```
TEXTO:
  CHAR(n)           Cadena de longitud fija n. Rellena con espacios a la derecha.
                    Usar para: códigos de longitud fija (ISO 3166 países: CHAR(2),
                    códigos postales: CHAR(5)).
  VARCHAR(n)        Cadena de longitud variable, máximo n caracteres.
                    Usar para: nombres, descripciones, emails, direcciones.
                    Especificar siempre n — nunca VARCHAR sin longitud.
  CHARACTER(n)      Sinónimo de CHAR(n) — forma larga del estándar.
  CHARACTER VARYING(n)  Sinónimo de VARCHAR(n) — forma larga del estándar.

NUMÉRICOS EXACTOS:
  NUMERIC(p, s)     Número decimal exacto. p = dígitos totales, s = decimales.
                    Usar para: dinero, cantidades, porcentajes.
                    Ejemplo: NUMERIC(15, 2) para importes monetarios.
  DECIMAL(p, s)     Equivalente a NUMERIC(p, s) en SQL-92.
                    Intercambiable con NUMERIC — preferir NUMERIC por ser más explícito.
  INTEGER           Entero de 32 bits. Rango: -2,147,483,648 a 2,147,483,647.
                    Usar para: contadores, cantidades, identificadores numéricos internos.
  SMALLINT          Entero de 16 bits. Rango: -32,768 a 32,767.
                    Usar para: códigos de estado, enumeraciones pequeñas.

NUMÉRICOS APROXIMADOS (usar con precaución):
  REAL              Punto flotante de precisión simple (~7 dígitos significativos).
  DOUBLE PRECISION  Punto flotante de doble precisión (~15 dígitos significativos).
  FLOAT(p)          Punto flotante con precisión p.
  ⚠️ NUNCA usar REAL, DOUBLE PRECISION ni FLOAT para valores monetarios o
     financieros — usar NUMERIC(p,s) que es exacto.

FECHA Y HORA:
  DATE              Fecha: año, mes, día. Sin información de hora ni zona horaria.
                    Usar para: fechas de nacimiento, fechas de vencimiento,
                    fechas de eventos sin componente horario.
  TIME              Hora del día: hora, minuto, segundo. Sin fecha.
  TIMESTAMP         Fecha y hora combinadas. Sin información de zona horaria.
                    Usar para: created_at, updated_at, marcas de tiempo de eventos.
  ⚠️ SQL-92 no define tipos con zona horaria explícita.
     Si el motor lo soporta y es necesario → documentar como extensión del motor
     y registrar en la sección [Extensiones de motor] del esquema.

BOOLEANO:
  ⚠️ BOOLEAN no forma parte del núcleo SQL-92. Alternativa portable:
     SMALLINT con restricción CHECK: CHECK (activo IN (0, 1))
     Convención: 0 = falso, 1 = verdadero. Documentar en todos los esquemas.
     Si el motor lo soporta nativamente (PostgreSQL, SQL Server 2008+) →
     documentar como extensión del motor.

BINARIO:
  ⚠️ No existe tipo binario en el núcleo SQL-92 portable.
     Alternativa: almacenar como VARCHAR con codificación Base64, o
     usar tipos del motor (BYTEA, BLOB, VARBINARY) documentados como extensión.
```

### 3.2 Tipos prohibidos — extensiones de motor no portables

```
PROHIBIDO USAR sin justificación y documentación explícita:

  SERIAL, BIGSERIAL, SMALLSERIAL   → propietario de PostgreSQL
  AUTO_INCREMENT                   → propietario de MySQL/MariaDB
  IDENTITY(1,1)                    → propietario de SQL Server
  NUMBER(p,s)                      → propietario de Oracle
  TEXT, TINYTEXT, MEDIUMTEXT       → propietario de MySQL
  BOOLEAN                          → no en núcleo SQL-92 (ver alternativa arriba)
  TIMESTAMP WITH TIME ZONE         → extensión, fuera del núcleo SQL-92
  TIMESTAMPTZ                      → propietario de PostgreSQL
  UUID                             → no en núcleo SQL-92
  JSONB, JSON                      → propietario de PostgreSQL
  ARRAY                            → no en núcleo SQL-92
  ENUM (tipo columna)              → propietario de MySQL; usar tabla de referencia
  TINYINT, MEDIUMINT               → propietario de MySQL
  DATETIME                         → propietario de MySQL/SQL Server

SI ES NECESARIO UN TIPO DE MOTOR ESPECÍFICO:
  1. Justificar por qué el tipo SQL-92 equivalente no es suficiente
  2. Documentar en la sección [Extensiones de motor] del esquema
  3. Indicar qué motores son compatibles
  4. Definir el tipo equivalente en cada motor si el esquema debe ser portable
```

### 3.3 Estrategia para claves primarias — portable SQL-92

```
PROBLEMA:
  Las secuencias automáticas (SERIAL, AUTO_INCREMENT, IDENTITY) son la forma
  más común de generar PKs, pero son extensiones propietarias de cada motor.
  SQL-92 no define un mecanismo estándar de autoincremento.

OPCIONES PORTABLES:

  OPCIÓN 1 — UUID como CHAR(36) (recomendada para sistemas distribuidos):
    id  CHAR(36)  NOT NULL
    CONSTRAINT pk_tabla PRIMARY KEY (id)

    El valor se genera en la capa de aplicación antes del INSERT:
      Python:      str(uuid.uuid4())           → "550e8400-e29b-41d4-a716-446655440000"
      JavaScript:  crypto.randomUUID()          → "550e8400-e29b-41d4-a716-446655440000"
      Java:        UUID.randomUUID().toString() → "550e8400-e29b-41d4-a716-446655440000"
      Go:          github.com/google/uuid       → uuid.New().String()
      SQL Server:  NEWID() (extensión — documentar)
      PostgreSQL:  gen_random_uuid() (extensión — documentar)

    ✓ Portable: CHAR(36) es SQL-92 estándar
    ✓ No expone secuencia del negocio
    ✓ Funciona en sistemas distribuidos sin coordinación central
    ✗ 36 bytes vs 4-8 bytes de INTEGER → índices más grandes
    ✗ No ordenado → fragmentación de índice en volúmenes altos

  OPCIÓN 2 — INTEGER con secuencia gestionada por la aplicación:
    id  INTEGER  NOT NULL
    CONSTRAINT pk_tabla PRIMARY KEY (id)

    La aplicación mantiene una tabla de secuencias:
    CREATE TABLE secuencias (
        nombre  VARCHAR(100)  NOT NULL,
        valor   INTEGER       NOT NULL  DEFAULT 0,
        CONSTRAINT pk_secuencias PRIMARY KEY (nombre)
    );

    Para obtener el siguiente valor:
      BEGIN;
        UPDATE secuencias SET valor = valor + 1 WHERE nombre = 'tabla_objetivo';
        SELECT valor FROM secuencias WHERE nombre = 'tabla_objetivo';
      COMMIT;

    ✓ Totalmente portable SQL-92
    ✓ Compacto (4 bytes)
    ✗ Requiere transacción adicional por INSERT
    ✗ Cuello de botella en sistemas de alta concurrencia

  OPCIÓN 3 — Clave compuesta natural (cuando existe):
    Usar solo cuando la combinación de atributos identifica de forma única y
    permanente cada fila, y no contiene datos sensibles.
    Ejemplo: (codigo_pais CHAR(2), codigo_moneda CHAR(3)) en tabla de divisas.

RECOMENDACIÓN:
  → Sistemas distribuidos o APIs públicas:  OPCIÓN 1 (UUID como CHAR(36))
  → Sistemas internos de un solo nodo:      OPCIÓN 2 (secuencia en tabla)
  → Datos de referencia con clave natural:  OPCIÓN 3
```

### 3.4 Convenciones de longitud y precisión

```
LONGITUDES RECOMENDADAS (VARCHAR):
  Nombre de persona:      VARCHAR(200)
  Email:                  VARCHAR(254)   ← límite RFC 5321
  Teléfono internacional: VARCHAR(20)    ← E.164 max 15 dígitos + símbolo + separadores
  Dirección:              VARCHAR(500)
  Descripción corta:      VARCHAR(500)
  URL:                    VARCHAR(2048)  ← límite práctico de navegadores
  Código de país ISO:     CHAR(2)
  Código de moneda ISO:   CHAR(3)
  UUID texto:             CHAR(36)

PRECISIÓN PARA NUMÉRICOS:
  Importe monetario:       NUMERIC(15, 2)   ← hasta 999,999,999,999,999.99
  Porcentaje:              NUMERIC(5, 2)    ← hasta 999.99%
  Tipo de cambio:          NUMERIC(10, 6)   ← hasta 9999.999999
  Coordenada geográfica:   NUMERIC(9, 6)    ← latitud/longitud con 6 decimales
  Cantidad de inventario:  INTEGER o NUMERIC(10, 0)
```

---

## 4. Roles de usuario — obligatorios en todo sistema

Todo sistema que gestione usuarios debe incluir **como mínimo** los siguientes
roles en su modelo de datos. Ningún sistema puede entregarse sin esta estructura.

### 4.1 Tabla de roles mínimos obligatorios

```sql
CREATE TABLE roles (
    id          CHAR(36)      NOT NULL,
    nombre      VARCHAR(50)   NOT NULL,
    descripcion VARCHAR(500)  NOT NULL,
    activo      SMALLINT      NOT NULL DEFAULT 1
                CONSTRAINT ck_roles_activo CHECK (activo IN (0, 1)),
    CONSTRAINT pk_roles         PRIMARY KEY (id),
    CONSTRAINT uq_roles_nombre  UNIQUE (nombre)
);

-- Registros obligatorios — insertar en la migración inicial:
INSERT INTO roles (id, nombre, descripcion) VALUES
    ('<uuid-1>', 'administrador', 'Acceso total al sistema. Gestiona usuarios, configuración y parámetros.'),
    ('<uuid-2>', 'operador',      'Ejecuta operaciones del negocio. Crea y modifica registros operativos.'),
    ('<uuid-3>', 'usuario',       'Acceso estándar. Usa las funciones del sistema según su perfil.'),
    ('<uuid-4>', 'desarrollador', 'Acceso a herramientas técnicas, logs, configuración y entornos de prueba.'),
    ('<uuid-5>', 'visualizador',  'Solo lectura. Consulta información sin poder modificar ningún registro.');
```

### 4.2 Definición de capacidades por rol

```
ROL: administrador
  Capacidades: TODAS
  Restricciones: ninguna dentro del sistema
  Casos de uso: configurar el sistema, gestionar usuarios y roles,
                definir parámetros globales, acceder a auditoría completa
  Principio: mínima cantidad de usuarios con este rol

ROL: operador
  Capacidades: crear, leer, modificar registros operativos del negocio
  Restricciones: no gestiona usuarios ni configuración del sistema
  Casos de uso: registrar transacciones, procesar solicitudes,
                actualizar estados de registros del día a día

ROL: usuario
  Capacidades: usar las funcionalidades propias de su perfil de negocio
  Restricciones: no accede a configuración ni a datos de otros usuarios
  Casos de uso: autogestión de su perfil, consultar sus propios datos,
                ejecutar las funciones que le corresponden por su rol en la organización

ROL: desarrollador
  Capacidades: acceso a herramientas técnicas, entornos de prueba,
               logs del sistema, configuración técnica
  Restricciones: no opera datos de producción de usuarios finales
                 en entornos productivos
  Casos de uso: depuración, monitoreo técnico, pruebas de integración,
                acceso a documentación técnica del sistema

ROL: visualizador
  Capacidades: solo lectura (SELECT) sobre los datos autorizados
  Restricciones: ninguna operación de escritura (INSERT, UPDATE, DELETE)
  Casos de uso: reportes, dashboards, auditoría de consulta,
                supervisión sin intervención
```

### 4.3 Tabla de asignación usuario-rol (relación)

```sql
CREATE TABLE usuarios_roles (
    usuario_id  CHAR(36)  NOT NULL,
    rol_id      CHAR(36)  NOT NULL,
    asignado_en TIMESTAMP NOT NULL,
    asignado_por CHAR(36) NOT NULL,
    activo      SMALLINT  NOT NULL DEFAULT 1
                CONSTRAINT ck_usuarios_roles_activo CHECK (activo IN (0, 1)),
    CONSTRAINT pk_usuarios_roles
        PRIMARY KEY (usuario_id, rol_id),
    CONSTRAINT fk_usuarios_roles_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    CONSTRAINT fk_usuarios_roles_rol
        FOREIGN KEY (rol_id) REFERENCES roles(id),
    CONSTRAINT fk_usuarios_roles_asignado_por
        FOREIGN KEY (asignado_por) REFERENCES usuarios(id)
);
```

### 4.4 Reglas de negocio obligatorias para el modelo de roles

```
INTEGRIDAD:
  □ Los 5 roles base no pueden eliminarse del sistema
  □ Los nombres de los 5 roles base no pueden modificarse
  □ Todo usuario debe tener asignado al menos un rol activo
  □ La desactivación de un usuario no elimina su historial de roles

SEGREGACIÓN:
  □ Un usuario puede tener múltiples roles si el negocio lo requiere
  □ Documentar explícitamente las combinaciones de roles que están
    prohibidas por conflicto de interés (ej: operador + visualizador
    en el mismo módulo financiero puede ser aceptable; administrador +
    desarrollador en producción requiere justificación)

AUDITORÍA:
  □ Todo cambio de rol debe registrar: quién asignó, cuándo, y por qué
  □ El campo asignado_por referencia al usuario que realizó el cambio
  □ Los roles históricos se desactivan (activo = 0), nunca se eliminan

EXTENSIBILIDAD:
  □ El sistema puede tener roles adicionales específicos del negocio
  □ Los roles adicionales siempre son subconjuntos de las capacidades
    de los 5 roles base
  □ Documentar la relación entre roles adicionales y los 5 roles base
```

---

## 5. Diseño relacional — normalización

```
PRIMERA FORMA NORMAL (1FN):
  □ Cada celda contiene un valor atómico (no listas, no arrays)
  □ Cada fila es única (existe clave primaria)
  Violación típica: columna "telefonos" con "555-1234, 555-5678"

SEGUNDA FORMA NORMAL (2FN):
  □ Cumple 1FN
  □ Cada atributo no-clave depende de TODA la clave primaria
  Violación típica: en tabla (orden_id, producto_id, nombre_producto)
                   nombre_producto depende solo de producto_id

TERCERA FORMA NORMAL (3FN) — OBJETIVO ESTÁNDAR:
  □ Cumple 2FN
  □ No hay dependencias transitivas (A→B→C donde C no depende de A directamente)
  Violación típica: tabla clientes con columna "nombre_ciudad"
                   que depende de "codigo_postal", no de "cliente_id"

CUÁNDO DESNORMALIZAR INTENCIONALMENTE:
  ✓ Reportes/analítica con queries que unen muchas tablas grandes
  ✓ Datos históricos que no cambian (snapshot de precio al momento de compra)
  ✓ Cuando el costo de los JOINs supera el costo de la redundancia controlada
  → Documentar explícitamente la desnormalización y su justificación
```

---

## 6. Claves primarias — referencia rápida

```
Ver sección 3.3 para el protocolo completo de selección.

RESUMEN DE DECISIÓN:
  ¿Sistema distribuido o API pública?   → CHAR(36) con UUID generado en aplicación
  ¿Sistema interno de un solo nodo?     → INTEGER con tabla de secuencias SQL-92
  ¿Datos de referencia con clave obvia? → Clave compuesta natural

PROHIBIDO:
  ✗ SERIAL, BIGSERIAL         (propietario PostgreSQL)
  ✗ AUTO_INCREMENT            (propietario MySQL)
  ✗ IDENTITY(1,1)             (propietario SQL Server)
  ✗ gen_random_uuid() en DDL  (propietario PostgreSQL — usar en aplicación o documentar)

CONSTRAINT obligatoria en todos los casos:
  CONSTRAINT pk_nombre_tabla PRIMARY KEY (id)
```

---

## 7. Índices — diseño y reglas

```
CUÁNDO crear un índice:
  □ Columnas en WHERE frecuentes con alta cardinalidad
  □ Columnas en JOIN (especialmente FK)
  □ Columnas en ORDER BY en queries frecuentes
  □ Columnas en GROUP BY en queries analíticas

CUÁNDO NO crear un índice:
  ✗ Tablas pequeñas (< 10k filas) — el seq scan es más rápido
  ✗ Columnas con baja cardinalidad (booleanos, enums de pocos valores)
  ✗ Columnas que se escriben muy frecuentemente (cada índice = costo en INSERT/UPDATE)

TIPOS DE ÍNDICE (PostgreSQL):
  B-Tree:  default, para =, <, >, BETWEEN, LIKE 'prefijo%'
  Hash:    solo para =, más rápido que B-Tree para igualdad exacta
  GIN:     arrays, JSONB, full-text search
  GiST:    datos geoespaciales, rangos, tipos complejos
  BRIN:    tablas muy grandes con datos ordenados naturalmente (logs, series de tiempo)

REGLA: Verificar con EXPLAIN ANALYZE antes y después de crear un índice.
       Un índice que no se usa es costo puro de escritura — eliminarlo.

ÍNDICES COMPUESTOS:
  Orden importa: (a, b, c) sirve para queries por (a), (a,b), (a,b,c)
  NO sirve para queries solo por (b) o (c)
  Regla: columna más selectiva primero
```

---

## 8. El problema N+1 — detectar y resolver

```
QUÉ ES:
  Ejecutar 1 query para obtener N registros y luego N queries adicionales
  para obtener datos relacionados de cada uno.

EJEMPLO DEL PROBLEMA:
  orders = db.query("SELECT * FROM orders")  -- 1 query
  for order in orders:
      user = db.query(f"SELECT * FROM users WHERE id = {order.user_id}")  -- N queries
  -- Total: N+1 queries para mostrar N órdenes

SOLUCIONES:

  1. JOIN explícito (más eficiente para relaciones simples):
     SELECT o.*, u.name, u.email
     FROM orders o
     JOIN users u ON u.id = o.user_id

  2. IN clause (para relaciones uno-a-muchos):
     user_ids = [o.user_id for o in orders]
     users = db.query(f"SELECT * FROM users WHERE id = ANY({user_ids})")
     -- 2 queries totales en lugar de N+1

  3. Eager loading en ORM:
     Python/SQLAlchemy:  db.query(Order).options(joinedload(Order.user))
     JavaScript/Prisma:  prisma.order.findMany({ include: { user: true } })
     Java/Hibernate:     @ManyToOne(fetch = FetchType.EAGER)

  4. DataLoader (para GraphQL o cuando el JOIN no es viable):
     Agrupa múltiples requests individuales en un solo batch

SEÑAL DE ALERTA: Si el número de queries crece con el número de filas → N+1
```

---

## 9. Transacciones — cuándo y cómo

```
USAR TRANSACCIÓN cuando:
  □ Múltiples operaciones deben ser atómicas (todas o ninguna)
  □ Hay invariantes de negocio que deben mantenerse entre tablas
  □ Se lee-y-escribe en secuencia y la consistencia importa

NIVELES DE AISLAMIENTO (de menor a mayor protección):
  READ UNCOMMITTED  → Lee datos no confirmados (dirty reads). Casi nunca usar.
  READ COMMITTED    → Default en PostgreSQL. Previene dirty reads.
  REPEATABLE READ   → Previene non-repeatable reads. Usar para reportes críticos.
  SERIALIZABLE      → Máximo aislamiento. Usar para operaciones financieras.

PROBLEMAS DE CONCURRENCIA A EVITAR:
  Dirty read:           leer datos de una transacción no confirmada
  Non-repeatable read:  mismo SELECT retorna diferentes valores en la misma tx
  Phantom read:         mismo WHERE retorna diferentes filas en la misma tx
  Lost update:          dos tx leen-modifican-escriben el mismo dato → una sobrescribe a la otra

PATRÓN OPTIMISTIC LOCKING (para evitar lost updates sin bloquear):
  □ Agregar columna version INTEGER o updated_at TIMESTAMP a la tabla
  □ En UPDATE: WHERE id = ? AND version = ?
  □ Si 0 filas afectadas → conflicto detectado → reintentar o notificar al usuario

REGLA: Mantener las transacciones lo más cortas posible.
       Una transacción larga = locks mantenidos = bloqueos para otras operaciones.
```

---

## 10. Migraciones — protocolo

```
REGLAS DE ORO:
  □ Una migración = un cambio lógico
  □ Las migraciones son INMUTABLES una vez aplicadas en producción
  □ Toda migración debe tener su rollback documentado o implementado
  □ Nunca modificar una migración ya aplicada — crear una nueva

ORDEN SEGURO PARA CAMBIOS EN PRODUCCIÓN (zero-downtime):
  Agregar columna:     Agregar nullable → deploy → llenar datos → agregar NOT NULL
  Renombrar columna:   Agregar nueva → deploy código que usa ambas → migrar datos → eliminar antigua
  Eliminar columna:    Deploy código que ya no la usa → eliminar en migración siguiente
  Agregar índice:      CREATE INDEX CONCURRENTLY (no bloquea writes en PostgreSQL)
  Eliminar tabla:      Igual que eliminar columna — deploy primero, eliminar después

HERRAMIENTAS ESTÁNDAR:
  Python:         Alembic (con SQLAlchemy) o Django migrations
  JavaScript/TS:  Prisma Migrate, Knex migrations, Drizzle
  Java:           Flyway o Liquibase
  Go:             golang-migrate, Atlas
  Ruby:           ActiveRecord migrations (Rails)
```

---

## 11. Connection pooling — configuración

```
POR QUÉ ES CRÍTICO:
  Abrir una conexión a BD cuesta ~50-100ms y consume recursos del servidor.
  Sin pool: cada request abre y cierra una conexión → lento y costoso.
  Con pool: las conexiones se reutilizan → eficiente.

CONFIGURACIÓN DEL POOL (valores de referencia):
  min_connections:  2-5  (siempre disponibles)
  max_connections:  10-20 por instancia de la aplicación
                    (PostgreSQL default max: 100 — dividir entre instancias)
  connection_timeout: 30s (tiempo máximo esperando una conexión del pool)
  idle_timeout:     600s (cerrar conexiones inactivas)
  max_lifetime:     1800s (renovar conexiones para evitar conexiones rancias)

HERRAMIENTAS POR LENGUAJE:
  Python:       SQLAlchemy pool, psycopg3 pool, asyncpg pool
  Node.js:      pg-pool, Knex pool, Prisma (pool interno)
  Java:         HikariCP (el más rápido), c3p0, DBCP2
  Go:           database/sql pool (built-in), pgxpool
  .NET:         Npgsql connection pool (built-in)

REGLA: En entornos serverless (Lambda, Cloud Functions) → usar un proxy
       de conexiones (RDS Proxy, PgBouncer) porque cada invocación
       abre nuevas conexiones y agota el límite del servidor.
```

---

## 12. Formato de entrega obligatorio

```
### [Decisiones de diseño]
Tipo de BD elegido y justificación.
Estrategia de claves primarias.
Índices diseñados y su justificación.

### [Modelo de datos]
Diagrama ER en texto o descripción de tablas.
Usar EXCLUSIVAMENTE tipos del núcleo SQL-92 (ver sección 3):

  CREATE TABLE nombre_tabla (
      id          CHAR(36)      NOT NULL,
      campo_texto VARCHAR(255)  NOT NULL,
      importe     NUMERIC(15,2) NOT NULL DEFAULT 0,
      activo      SMALLINT      NOT NULL DEFAULT 1
                  CONSTRAINT ck_nombre_tabla_activo CHECK (activo IN (0, 1)),
      fecha_alta  DATE          NOT NULL,
      creado_en   TIMESTAMP     NOT NULL,
      CONSTRAINT pk_nombre_tabla    PRIMARY KEY (id),
      CONSTRAINT fk_nombre_tabla_ref
          FOREIGN KEY (campo_ref) REFERENCES otra_tabla(id)
  );

  -- Sección de extensiones de motor (si son necesarias):
  -- Motor: PostgreSQL 16
  -- creado_en TIMESTAMP WITH TIME ZONE  (fuera del núcleo SQL-92)
  -- Motores compatibles: PostgreSQL, Oracle, SQL Server 2008+

### [Índices]
CREATE INDEX CONCURRENTLY idx_nombre ON tabla(columna) WHERE condicion;
Justificación de cada índice.

### [Queries / Migraciones]
\`\`\`sql
-- Query o migración comentada
\`\`\`

### [EXPLAIN ANALYZE]  ← incluir para queries de producción
Plan de ejecución y costo estimado.

### [Advertencias]
Limitaciones, N+1 potenciales, índices pendientes, deuda técnica.

### [Referencias]  ← APA 7, más reciente → más antigua
```

---

## 13. Modos globales — comportamiento de BD por modo

```
MODO DEBUG (SYSTEM_MODE=DEBUG):
  □ Loggear TODA query SQL ejecutada con:
      - SQL completo (nunca "SELECT ?" — expandir los parámetros)
      - Tiempo de ejecución en ms
      - Número de filas afectadas o retornadas
      - Plan de ejecución cuando la query supere 100ms
  □ Loggear conexiones tomadas y devueltas al pool
  □ Loggear inicio y fin de cada transacción con su duración
  □ Detectar y loggear cuando se ejecutan más de N queries por operación
    (señal de N+1 — configurar N como umbral en configuracion_sistema)

MODO PERFORMANCE (SYSTEM_MODE=PERFORMANCE):
  □ Sin logging de queries individuales — solo errores de BD
  □ Connection pool activo y configurado (ver sección 11)
  □ Caché de queries frecuentes activado con TTL definido en configuracion_sistema
  □ Prepared statements reutilizados (no recompilar cada query)
  □ Índices verificados con EXPLAIN ANALYZE antes de producción
  □ Paginación o streaming en TODAS las consultas que retornan colecciones

MODO MANTENIMIENTO (SYSTEM_MODE=MAINTENANCE):
  □ NINGÚN INSERT/UPDATE/DELETE/DDL se ejecuta directamente
  □ Cada operación de escritura genera un script en MAINTENANCE_OUTPUT_PATH:
      Nombre: YYYYMMDD_HHMMSS_<tabla>_<operacion>.sql
      Contenido: metadata + BEGIN + SQL + COMMIT + rollback comentado
  □ Las consultas SELECT continúan ejecutándose normalmente
  □ Si una transacción mezcla lecturas y escrituras → capturar solo
    las escrituras en el script; ejecutar las lecturas normalmente

TABLA EN BD PARA TRACKING DE SCRIPTS DE MANTENIMIENTO (SQL-92):
  CREATE TABLE mantenimiento_scripts (
      id              CHAR(36)      NOT NULL,
      nombre_archivo  VARCHAR(255)  NOT NULL,
      modulo          VARCHAR(100)  NOT NULL,
      operacion       VARCHAR(200)  NOT NULL,
      usuario_id      CHAR(36)      NOT NULL,
      generado_en     TIMESTAMP     NOT NULL,
      revisado_por    CHAR(36),
      revisado_en     TIMESTAMP,
      aplicado_por    CHAR(36),
      aplicado_en     TIMESTAMP,
      resultado       VARCHAR(50),
      observaciones   VARCHAR(500),
      CONSTRAINT pk_mantenimiento_scripts PRIMARY KEY (id)
  );
```

---

## 14. Restricciones

```
ROLES DE USUARIO:
✗ No diseñar sistemas con usuarios sin incluir los 5 roles mínimos obligatorios:
  administrador, operador, usuario, desarrollador, visualizador
✗ No permitir eliminar físicamente los 5 roles base del sistema
✗ No crear usuarios sin asignarles al menos un rol activo
✗ No omitir la tabla de auditoría de asignación de roles (usuarios_roles)

TIPOS DE DATOS:
✗ No usar SERIAL, BIGSERIAL, SMALLSERIAL (propietario PostgreSQL)
✗ No usar AUTO_INCREMENT (propietario MySQL/MariaDB)
✗ No usar IDENTITY(1,1) (propietario SQL Server)
✗ No usar TIMESTAMPTZ (propietario PostgreSQL) — usar TIMESTAMP de SQL-92
✗ No usar BOOLEAN como tipo de columna — usar SMALLINT con CHECK (col IN (0,1))
✗ No usar TEXT, TINYTEXT, MEDIUMTEXT (propietario MySQL) — usar VARCHAR(n)
✗ No usar UUID como tipo de columna — usar CHAR(36) de SQL-92
✗ No usar JSONB, JSON, ARRAY como tipos de columna sin documentar como extensión
✗ No usar ENUM como tipo de columna (propietario MySQL) — usar tabla de referencia
✗ No usar NUMBER (propietario Oracle) — usar NUMERIC(p,s) de SQL-92
✗ No usar DATETIME (propietario MySQL/SQL Server) — usar TIMESTAMP de SQL-92
✗ No definir DEFAULT gen_random_uuid() en DDL — generar UUID en la aplicación
✗ No usar FLOAT o DOUBLE PRECISION para valores monetarios — usar NUMERIC(p,s)
✗ No declarar VARCHAR sin longitud máxima

CONSULTAS Y DISEÑO:
✗ No cargar colecciones completas en memoria sin paginación o streaming
✗ No ejecutar queries dentro de loops (N+1)
✗ No usar SELECT * en queries de producción
✗ No modificar migraciones ya aplicadas en producción
✗ No usar transacciones de larga duración sin justificación
✗ No crear índices sin verificar su uso con EXPLAIN ANALYZE
✗ No almacenar contraseñas en texto plano — siempre bcrypt/argon2
✗ No usar claves naturales mutables como PRIMARY KEY
✗ No hacer DROP TABLE o ALTER TABLE sin plan de rollback documentado
```

---

## 15. Referencias del dominio (APA 7)

International Organization for Standardization. (1992).
    *ISO/IEC 9075:1992 — Information technology: Database language SQL*. ISO.
    [Nota: el estándar se actualiza periódicamente; SQL-92 establece el núcleo
    de portabilidad. Versiones posteriores (SQL:1999, SQL:2003, SQL:2011,
    SQL:2016, SQL:2023) añaden extensiones opcionales.]

Kleppmann, M. (2017). *Designing data-intensive applications: The big ideas
    behind reliable, scalable, and maintainable systems*. O'Reilly Media.

Date, C. J. (2019). *Database design and relational theory: Normal forms
    and all that jazz* (2nd ed.). Apress.

PostgreSQL Global Development Group. (2024). *PostgreSQL 16 documentation*.
    https://www.postgresql.org/docs/16/
