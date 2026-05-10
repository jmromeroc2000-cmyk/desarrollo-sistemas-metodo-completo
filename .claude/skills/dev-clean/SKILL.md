---
name: programador-codigo-limpio
description: >
  Activar cuando el usuario pida: revisar la calidad de código existente;
  identificar code smells o anti-patrones; refactorizar funciones, clases
  o módulos; mejorar la legibilidad o mantenibilidad sin cambiar comportamiento;
  aplicar principios SOLID; reducir la complejidad ciclomática; mejorar nombres
  de variables, funciones o clases; eliminar código duplicado; o cualquier tarea
  donde mejorar la estructura interna del código sin cambiar su comportamiento
  externo sea el objetivo principal.
  Comandos de activación: /dev-clean · [MODO: CLEAN CODE]
---

# SKILL — Código limpio y refactorización

## 1. Verificaciones obligatorias ANTES de refactorizar

- [ ] **Pruebas existentes** — ¿hay pruebas que verifiquen el comportamiento actual? Si no → escribirlas antes de refactorizar
- [ ] **Alcance** — ¿qué archivos o módulos están en scope? No refactorizar de más
- [ ] **Comportamiento observable** — ¿está documentado lo que el código hace hoy?
- [ ] **Entorno** — ¿hay código en producción que depende de este módulo?
- [ ] **Deuda técnica** — ¿es deuda intencional o accidental?

**Regla de oro:** Refactorizar = cambiar la estructura interna SIN cambiar el comportamiento externo. Si cambia el comportamiento → no es refactorización, es una nueva funcionalidad o corrección de bug.

---

## 2. Principios SOLID — verificar en cada diseño

```
S — Single Responsibility Principle (SRP):
    Una clase / función tiene UNA sola razón para cambiar.
    Señal de violación: "y también..." en la descripción de la función.
    Ejemplo: UserService que valida, guarda EN BD Y envía emails → 3 responsabilidades.

O — Open/Closed Principle (OCP):
    Abierto para extensión, cerrado para modificación.
    Señal de violación: Agregar un nuevo tipo requiere modificar if/switch existentes.
    Solución típica: polimorfismo, estrategia, inyección de dependencias.

L — Liskov Substitution Principle (LSP):
    Los subtipos deben poder sustituir a sus tipos base sin romper el programa.
    Señal de violación: Sobrescribir un método lanzando NotImplementedException.
    Ejemplo clásico: Rectangle / Square → Square no puede sustituir a Rectangle.

I — Interface Segregation Principle (ISP):
    Muchas interfaces específicas son mejores que una general.
    Señal de violación: Implementar una interfaz y dejar métodos vacíos o con NotImplemented.

D — Dependency Inversion Principle (DIP):
    Depender de abstracciones, no de implementaciones concretas.
    Señal de violación: new DatabaseConnection() dentro de un servicio de negocio.
    Solución: inyectar la dependencia desde fuera (DI / IoC container).
```

---

## 3. Code smells — catálogo y soluciones

```
CÓDIGO HINCHADO:
  Long Method (>20 líneas):
    → Extraer funciones con nombre descriptivo
    → Señal: necesitas un comentario para entender un bloque → es una función

  Large Class (>200 líneas, >10 métodos):
    → Identificar responsabilidades distintas → extraer clases

  Long Parameter List (>3-4 parámetros):
    → Agrupar en objeto de parámetros / DTO
    → Señal: fn(user_id, user_name, user_email, user_role) → fn(user: User)

  Duplicated Code (misma lógica en 2+ lugares):
    → Extraer función o clase común
    → Regla DRY: Don't Repeat Yourself

ACOPLAMIENTO:
  Feature Envy (método que usa más datos de otra clase que de la propia):
    → Mover el método a la clase que usa

  Inappropriate Intimacy (clase A conoce detalles internos de clase B):
    → Definir interfaz clara entre clases; reducir acceso a internos

  Message Chains (a.getB().getC().getD().getValue()):
    → Ley de Demeter: hablar solo con amigos directos
    → Extraer método en la clase intermedia

CONDICIONALES:
  Switch/if-else largo sobre tipo:
    → Polimorfismo: cada tipo implementa su propio comportamiento

  Null Checks en cascada:
    → Objeto Nulo (Null Object Pattern)
    → Optional / Maybe monad
    → Fail fast: validar al inicio, no checar null en cada paso

  Flag Arguments (booleano que cambia el comportamiento de una función):
    → Split: dos funciones con nombres descriptivos
    → fn(true) → procesarConDescuento(); fn(false) → procesarSinDescuento()

CÓDIGO INNECESARIO:
  Dead Code (código que nunca se ejecuta):
    → Eliminar. Git guarda la historia — no necesitas comentarlo.

  Speculative Generality (abstracción para "uso futuro"):
    → YAGNI: You Aren't Gonna Need It
    → Implementar lo que se necesita hoy, no lo que podría necesitarse

  Comments that explain WHAT (el código debería ser claro por sí solo):
    → Refactorizar hasta que el código sea auto-explicativo
    → Los comentarios deben explicar el PORQUÉ, no el qué
```

---

## 4. Nomenclatura — estándar

```
FUNCIONES Y MÉTODOS:
  □ Verbos en imperativo: calcular_total(), get_user(), send_email()
  □ Booleanos: prefijo is_, has_, can_, should_: is_valid(), has_permission()
  □ Longitud proporcional al alcance: variable local corta OK, función pública: descriptiva
  □ Sin abreviaciones crípticas: usr → user, amt → amount, tmp → temp o nombre real

  Mal:  def proc(d, f):
  Bien: def procesar_pago(datos_pago: DatoPago, factor_descuento: float):

VARIABLES:
  □ Nombres que revelan intención: elapsed_time_in_days, no d
  □ Sin prefijos húngaros: no strNombre, intEdad → nombre, edad
  □ Constantes en UPPER_SNAKE_CASE: MAX_RETRY_ATTEMPTS = 3
  □ Evitar nombres de una letra excepto en loops cortos (i, j, k) y lambdas

CLASES:
  □ Sustantivos: UserRepository, PaymentProcessor, EmailService
  □ Sin sufijos genéricos sin valor: UserManager, DataHandler → qué hace exactamente?
  □ Una clase = una responsabilidad = un nombre que la describe completamente

EVITAR:
  ✗ Nombres con números: handler1, handler2 → nombrar por su propósito
  ✗ Negaciones en booleanos: is_not_valid → is_invalid o !is_valid
  ✗ Codificar el tipo en el nombre: user_list → users, user_dict → users_by_id
```

---

## 5. Complejidad ciclomática — medir y reducir

```
QUÉ ES:
  Número de caminos de ejecución independientes en una función.
  Cada if, elif, for, while, and, or, catch, case → suma 1.

UMBRALES:
  1-5:   Función simple, fácil de probar          ← objetivo
  6-10:  Moderada, aún manejable
  11-15: Alta, considerar refactorización
  >15:   Muy alta, difícil de probar y mantener   ← refactorizar obligatorio

TÉCNICAS DE REDUCCIÓN:
  1. Early return (guard clauses):
     Mal:
       def procesar(usuario):
           if usuario is not None:
               if usuario.activo:
                   if usuario.tiene_saldo():
                       return procesar_pago(usuario)
     Bien:
       def procesar(usuario):
           if usuario is None: return None
           if not usuario.activo: raise UsuarioInactivoError()
           if not usuario.tiene_saldo(): raise SaldoInsuficienteError()
           return procesar_pago(usuario)

  2. Extraer condiciones complejas a funciones nombradas:
     Mal:  if user.age >= 18 and user.country in ALLOWED_COUNTRIES and not user.banned:
     Bien: if puede_acceder(user):

  3. Tabla de decisiones para lógica compleja multi-condición:
     Reemplazar if/elif/elif/elif → diccionario o tabla de dispatch

  4. Polimorfismo para reemplazar switch/case sobre tipos

HERRAMIENTAS DE MEDICIÓN:
  Python:      radon cc archivo.py
  JavaScript:  eslint con complexity rule
  Java:        SonarQube, Checkstyle
  Go:          gocognit
```

---

## 6. Funciones — reglas de diseño

```
TAMAÑO:
  □ Ideal: 5-15 líneas
  □ Máximo: 20-30 líneas (con justificación)
  □ Si necesita un comentario que diga "Paso 1... Paso 2..." → extraer funciones

UNA ABSTRACCIÓN POR FUNCIÓN:
  La función debe operar en un solo nivel de abstracción.
  Mal: función que hace validación + lógica de negocio + persistencia + notificación
  Bien: orquestador que llama a validar(), procesar(), guardar(), notificar()

SIN EFECTOS SECUNDARIOS OCULTOS:
  La función debe hacer lo que su nombre dice y nada más.
  Mal: is_valid_user(user) que TAMBIÉN actualiza un campo en la BD
  Bien: is_valid_user(user) solo valida; el llamador decide si guardar

PARÁMETROS DE SALIDA:
  Evitar modificar parámetros como salida implícita.
  Mal:  populate_user(user)  # modifica user in-place sin indicarlo
  Bien: user = build_user(raw_data)  # retorna el resultado

SEPARAR COMANDOS DE CONSULTAS (CQS):
  Una función o consulta (retorna valor, no modifica estado)
  o    un comando (modifica estado, retorna void/None).
  No ambas cosas a la vez.
```

---

## 7. Catálogo de refactorizaciones seguras

```
EXTRACT METHOD / FUNCTION:
  Tomar un bloque de código y convertirlo en función con nombre.
  Cuándo: bloque con comentario, bloque > 5 líneas, código duplicado.

INLINE METHOD:
  Reemplazar llamada a función por su cuerpo cuando la función es trivial.
  Cuándo: la función es tan obvia que su nombre no añade valor.

RENAME:
  Cambiar nombre a variable, función o clase para mayor claridad.
  Cuándo: siempre que el nombre actual no revele la intención.

EXTRACT VARIABLE:
  Nombrar una expresión compleja.
  Mal:  if (user.age >= 18) and (user.country in LATAM_COUNTRIES):
  Bien: es_adulto = user.age >= 18
        esta_en_latam = user.country in LATAM_COUNTRIES
        if es_adulto and esta_en_latam:

INTRODUCE PARAMETER OBJECT:
  Reemplazar lista larga de parámetros por un objeto.
  fn(fecha_inicio, fecha_fin, zona_horaria) → fn(rango_fechas: RangoFechas)

REPLACE CONDITIONAL WITH POLYMORPHISM:
  Eliminar if/switch sobre tipo reemplazando con clases que implementan interfaz.

MOVE METHOD / FIELD:
  Mover método o campo a la clase que más lo usa.
```

---

## 8. Formato de entrega obligatorio

```
### [Diagnóstico]
Code smells identificados, listados con su categoría y severidad.
Complejidad ciclomática de las funciones problemáticas.

### [Plan de refactorización]
Orden de las refactorizaciones (de menor a mayor riesgo).
Pruebas que se ejecutarán para verificar que el comportamiento no cambió.

### [Código antes]
\`\`\`{lenguaje}
// Código original con anotaciones de los problemas
\`\`\`

### [Código después]
\`\`\`{lenguaje}
// Código refactorizado con comentarios sobre qué se aplicó
\`\`\`

### [Verificación]
Pruebas que confirman comportamiento idéntico antes y después.
Métricas: complejidad ciclomática antes/después, líneas antes/después.

### [Deuda técnica pendiente]
Lo que quedó sin refactorizar y por qué (priorización explícita).

### [Referencias]  ← APA 7, más reciente → más antigua
```

---

## 9. Modos globales — criterios de código limpio por modo

```
El código que implementa los 3 modos debe seguir los mismos estándares
de limpieza que cualquier otro código del sistema.

PRINCIPIOS DE CÓDIGO LIMPIO PARA LA IMPLEMENTACIÓN DE MODOS:

  □ Leer SYSTEM_MODE UNA sola vez al inicio — no en cada función
    Mal:  if os.getenv("SYSTEM_MODE") == "DEBUG":  ← re-lee en cada llamada
    Bien: from config import IS_DEBUG               ← lee la constante global

  □ No mezclar lógica de modo con lógica de negocio en la misma función
    Mal:  una función de 80 líneas con ifs de modo entrelazados con lógica
    Bien: separar en _logica_principal() y wrapper que gestiona los modos

  □ Extraer el bloque de debug a una función nombrada si es complejo:
    Mal:  15 líneas de logging inline en cada función
    Bien: _log_debug_entrada(funcion, params) y _log_debug_salida(resultado, ms)

  □ Extraer la generación del script de mantenimiento a un módulo dedicado
    (ver skill /dev-modes sección 5 — módulo maintenance.py)
    Nunca inline el SQL del script dentro de la función de negocio

  □ Los nombres de las variables de modo deben ser explícitos:
    Bien: IS_DEBUG, IS_PERFORMANCE, IS_MAINTENANCE
    Mal:  modo == 1, debug_flag, mant

  □ Documentar en el docstring de cada función cómo se comporta en cada modo:
    def procesar_pago(pago_id, monto, usuario_id):
        '''Procesa un pago.
        DEBUG:       loggea entrada/salida y tiempos.
        PERFORMANCE: ejecuta directamente sin logging adicional.
        MAINTENANCE: genera script SQL, retorna estado PENDIENTE.
        '''
```

---

## 10. Restricciones

```
✗ No refactorizar código sin pruebas que cubran su comportamiento actual
✗ No cambiar comportamiento observable durante una refactorización
✗ No aplicar patrones de diseño "por si acaso" — solo cuando hay necesidad real (YAGNI)
✗ No dejar código comentado en el repositorio — usar git para recuperar historia
✗ No omitir el diagnóstico — refactorizar sin entender el problema es más peligroso que no hacerlo
✗ No hacer refactorizaciones masivas en una sola sesión sin validación incremental
```

---

## 11. Referencias del dominio (APA 7)

Fowler, M. (2018). *Refactoring: Improving the design of existing code*
    (2nd ed.). Addison-Wesley.

Martin, R. C. (2008). *Clean code: A handbook of agile software
    craftsmanship*. Prentice Hall.

Martin, R. C. (2017). *Clean architecture: A craftsman's guide to software
    structure and design*. Prentice Hall.

Kerievsky, J. (2004). *Refactoring to patterns*. Addison-Wesley.
