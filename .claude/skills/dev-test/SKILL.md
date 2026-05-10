---
name: programador-pruebas-testing
description: >
  Activar cuando el usuario pida: escribir pruebas unitarias o de integración;
  diseñar una estrategia de testing para un módulo o sistema; revisar cobertura
  de código; aplicar TDD (Test-Driven Development); crear mocks, stubs o fixtures;
  depurar pruebas que fallan; configurar un framework de testing; evaluar la calidad
  de un suite de pruebas existente; o cualquier tarea donde el entregable principal
  sea código de prueba o una estrategia de testing.
  Comandos de activación: /dev-test · [MODO: TESTING]
---

# SKILL — Pruebas unitarias e integración

## 1. Verificaciones obligatorias ANTES de escribir pruebas

- [ ] **Framework de testing** — ¿pytest, Jest, JUnit 5, xUnit, Vitest, Go test?
- [ ] **Tipo de prueba requerida** — ¿unitaria, integración, e2e, contrato, snapshot?
- [ ] **Cobertura objetivo** — ¿hay un mínimo definido? (recomendado: 80% líneas, 100% caminos críticos)
- [ ] **Código a probar** — ¿está disponible o se escribe junto con las pruebas (TDD)?
- [ ] **Dependencias externas** — ¿hay BD, APIs, filesystem, tiempo? → requieren mocking
- [ ] **CI/CD** — ¿las pruebas corren en pipeline? ¿hay restricciones de tiempo de ejecución?

---

## 2. Pirámide de testing — proporciones y responsabilidades

```
                    ╱ E2E ╲              ← Pocas, lentas, costosas
                   ╱────────╲              Validan flujos completos de usuario
                  ╱Integración╲         ← Moderadas
                 ╱─────────────╲          Validan que los módulos trabajan juntos
                ╱   Unitarias   ╲      ← Muchas, rápidas, baratas
               ╱─────────────────╲       Validan lógica de una unidad aislada

PROPORCIÓN RECOMENDADA:
  Unitarias:    70% del total de pruebas
  Integración:  20% del total de pruebas
  E2E:          10% del total de pruebas

REGLA: Si una prueba tarda más de 100ms → probablemente no es unitaria.
```

---

## 3. Estructura AAA — obligatoria en toda prueba

```
ARRANGE — preparar el contexto
  Crear objetos, datos de entrada, mocks y estado inicial.
  Todo lo que la prueba necesita para ejecutarse.

ACT — ejecutar la unidad bajo prueba
  UNA SOLA llamada a la función o método que se prueba.
  Si hay más de una llamada → probablemente son dos pruebas diferentes.

ASSERT — verificar el resultado
  Verificar el resultado observable: valor retornado, estado modificado,
  llamadas realizadas a dependencias (mocks), excepciones lanzadas.
  UNA afirmación principal por prueba (pueden haber secundarias de soporte).

EJEMPLO:
  def test_calcula_iva_correctamente():
      # Arrange
      precio_base = 1000.00
      tasa_iva = 0.16

      # Act
      total = calcular_total_con_iva(precio_base, tasa_iva)

      # Assert
      assert total == 1160.00
```

---

## 4. Nomenclatura de pruebas — estándar obligatorio

```
FORMATO: test_[unidad]_[escenario]_[resultado_esperado]

Ejemplos correctos:
  test_calcular_total_con_iva_tasa_cero_retorna_precio_base
  test_crear_usuario_email_duplicado_lanza_excepcion
  test_procesar_pago_saldo_insuficiente_retorna_false
  test_parsear_fecha_formato_invalido_retorna_none

Ejemplos incorrectos:
  test1                          ← no describe nada
  test_usuario                   ← demasiado vago
  test_que_funcione_bien         ← no especifica escenario ni resultado

REGLA: El nombre de la prueba debe poder leerse como una especificación:
  "Dado [escenario], cuando [acción], entonces [resultado]"
```

---

## 5. Pruebas unitarias — protocolo

```
PRINCIPIOS SOLID para pruebas:
  □ Una prueba = una razón para fallar
  □ Las pruebas son independientes entre sí (no comparten estado)
  □ El orden de ejecución no importa
  □ Son deterministas: mismo input → mismo resultado siempre
  □ Son rápidas: < 100ms por prueba unitaria

CASOS OBLIGATORIOS a cubrir en toda función:
  □ Caso feliz (happy path): input válido, resultado esperado
  □ Casos límite (boundary): valores en el borde del rango válido
  □ Casos de error: inputs inválidos, null/None, vacíos, negativos
  □ Casos edge específicos del dominio: lógica de negocio particular

COBERTURA MÍNIMA:
  □ 100% de caminos de decisión en lógica de negocio crítica
  □ 100% de manejo de excepciones declaradas
  □ 80%+ de cobertura de líneas en el módulo completo
  Herramientas: coverage.py (Python), Istanbul/c8 (JS/TS), JaCoCo (Java)
```

---

## 6. Mocking — cuándo y cómo

```
MOCKEAR cuando la dependencia:
  ✓ Hace llamadas a red (APIs, bases de datos, servicios externos)
  ✓ Depende del tiempo (datetime.now(), Date.now())
  ✓ Genera aleatoriedad (random, UUID)
  ✓ Lee o escribe el filesystem
  ✓ Envía emails, SMS, notificaciones
  ✓ Es lenta o no determinista

NO MOCKEAR cuando:
  ✗ Es una clase de valor simple del mismo módulo
  ✗ Es una función pura sin efectos secundarios
  ✗ La dependencia es tan simple que el mock es más complejo que la real

TIPOS DE TEST DOUBLE:
  Stub:    retorna valores predefinidos, no verifica llamadas
  Mock:    verifica que fue llamado con los argumentos correctos
  Fake:    implementación simplificada funcional (ej: BD en memoria)
  Spy:     wrapper sobre la implementación real que registra llamadas

REGLA DE ORO DEL MOCKING:
  Mockear en la frontera del módulo, no en el interior.
  Si mockeas demasiado → la prueba prueba los mocks, no el código.
```

---

## 7. Pruebas de integración — protocolo

```
PROPÓSITO: verificar que dos o más módulos trabajan correctamente juntos.
NO es una prueba unitaria con más código — tiene propósito diferente.

CONFIGURACIÓN:
  □ Usar bases de datos de prueba dedicadas (nunca producción)
  □ Resetear el estado entre pruebas (truncar tablas, limpiar cache)
  □ Usar contenedores Docker para servicios externos cuando sea posible
    (testcontainers-python, Testcontainers for Java, etc.)
  □ Datos de prueba reproducibles: fixtures o factories, no datos manuales

ESTRUCTURA:
  □ Setup: preparar el estado del sistema (insertar datos base)
  □ Acción: ejecutar la operación que integra los módulos
  □ Assert: verificar el estado resultante en TODOS los módulos involucrados
  □ Teardown: limpiar el estado para no afectar otras pruebas

SEÑALES DE QUE UNA PRUEBA DE INTEGRACIÓN ESTÁ MAL DISEÑADA:
  - Depende del orden de ejecución con otras pruebas
  - Tarda más de 5 segundos
  - Falla intermitentemente (flaky test)
  - Modifica datos que otras pruebas usan
```

---

## 8. TDD — cuándo y cómo aplicarlo

```
CICLO RED-GREEN-REFACTOR:
  1. RED:    Escribir una prueba que falla (el comportamiento aún no existe)
  2. GREEN:  Escribir el mínimo código para que la prueba pase
  3. REFACTOR: Mejorar el código sin romper las pruebas

CUÁNDO APLICAR TDD:
  ✓ Lógica de negocio nueva con requisitos claros
  ✓ Corrección de bugs (escribir prueba que reproduzca el bug primero)
  ✓ Código con muchas ramas de decisión
  ✓ APIs públicas de un módulo

CUÁNDO NO ES PRÁCTICO:
  ✗ Código de infraestructura o configuración
  ✗ Prototipos exploratorios
  ✗ Integración con sistemas externos mal documentados

REGLA: La prueba debe fallar por la razón correcta antes de escribir el código.
  Si la prueba falla por error de sintaxis → no es TDD, es un error.
```

---

## 9. Formato de entrega obligatorio

```
### [Estrategia de testing]
Tipo(s) de prueba incluidas y justificación.
Cobertura objetivo y cobertura actual si se puede medir.

### [Pruebas]
\`\`\`{lenguaje}
# Pruebas organizadas por: imports → fixtures/mocks → casos felices
# → casos de error → casos edge
# Cada prueba con nombre descriptivo siguiendo sección 4
\`\`\`

### [Cómo ejecutar]
Comando exacto para correr las pruebas.
Comando para ver el reporte de cobertura.

### [Casos no cubiertos]
Lista explícita de escenarios que quedan sin prueba y por qué.

### [Referencias]  ← APA 7, más reciente → más antigua
```

---

## 10. Herramientas por lenguaje (versiones vigentes a ago 2025)

| Lenguaje | Unitarias | Integración | Cobertura | Mocking |
|----------|-----------|-------------|-----------|---------|
| Python | `pytest` ≥8.0 | `pytest` + `testcontainers` | `coverage.py` ≥7 | `unittest.mock`, `pytest-mock` |
| JavaScript | `Vitest` ≥1.0 | `Vitest` + `supertest` | `c8` / Istanbul | `vi.mock()` built-in |
| TypeScript | `Vitest` ≥1.0 | `Vitest` + `supertest` | `c8` / Istanbul | `vi.mock()` built-in |
| Java | `JUnit 5` ≥5.10 | `Spring Boot Test` | `JaCoCo` | `Mockito` ≥5 |
| Go | `testing` built-in | `testing` + `testcontainers-go` | `go test -cover` | `testify/mock` |
| C# | `xUnit` ≥2.7 | `xUnit` + `WebApplicationFactory` | `Coverlet` | `Moq` ≥4.20 |

---

## 11. Modos globales — qué probar por modo

Las pruebas deben cubrir el comportamiento del sistema en los 3 modos.
Ver skill `/dev-modes` para la especificación completa de cada modo.

```
PRUEBAS OBLIGATORIAS POR MODO:

MODO DEBUG:
  □ Verificar que el logging de entrada/salida se activa
  □ Verificar que las queries SQL se loggean con parámetros expandidos
  □ Verificar que los tiempos de ejecución se registran en ms
  □ Verificar que los stack traces aparecen en excepciones
  □ Verificar que datos sensibles (passwords, tokens) están enmascarados
    → Prueba negativa: el log NO debe contener el password real

MODO PERFORMANCE:
  □ Verificar que el nivel de log es solo WARNING o superior
    → El logger no debe recibir mensajes DEBUG ni INFO
  □ Verificar que el caché retorna resultados sin llamar a la BD
  □ Verificar que las colecciones retornan paginadas, no completas
  □ Prueba de performance documentada: medir latencia p95 y throughput
    comparando modo DEBUG vs modo PERFORMANCE

MODO MANTENIMIENTO:
  □ Verificar que ningún INSERT/UPDATE/DELETE se ejecuta en BD
  □ Verificar que se genera el archivo .sql en MAINTENANCE_OUTPUT_PATH
  □ Verificar que el archivo .sql contiene metadata correcta
  □ Verificar que el archivo .sql contiene el rollback
  □ Verificar que el sistema retorna estado "PENDIENTE" al usuario
  □ Verificar que los SELECT siguen funcionando normalmente

EJEMPLO DE PRUEBA DE MODO MANTENIMIENTO (Python/pytest):
  def test_procesar_pago_modo_mantenimiento(tmp_path, monkeypatch):
      monkeypatch.setenv("SYSTEM_MODE", "MAINTENANCE")
      monkeypatch.setenv("MAINTENANCE_OUTPUT_PATH", str(tmp_path))

      resultado = procesar_pago("pay_123", 500.00, "usr_abc")

      # No debe haber escrituras en BD
      assert db.query("SELECT COUNT(*) FROM pagos WHERE id='pay_123'") == 0
      # Debe retornar estado PENDIENTE
      assert resultado["estado"] == "PENDIENTE"
      # Debe generar el script
      scripts = list(tmp_path.glob("*.sql"))
      assert len(scripts) == 1
      contenido = scripts[0].read_text()
      assert "INSERT INTO pagos" in contenido
      assert "ROLLBACK" in contenido or "-- BEGIN" in contenido
```

---

## 12. Restricciones

```
✗ No escribir pruebas que dependan del orden de ejecución
✗ No usar datos de producción en pruebas
✗ No escribir pruebas que pasen siempre sin verificar nada real (false positive)
✗ No mockear tanto que la prueba pruebe los mocks, no el código
✗ No ignorar pruebas que fallan intermitentemente (flaky tests)
    → investigar y corregir, nunca marcar como skip permanentemente
✗ No mezclar lógica de prueba con lógica de producción en el mismo archivo
✗ No declarar "100% de cobertura" si solo se miden líneas, no ramas
```

---

## 13. Referencias del dominio (APA 7)

Meszaros, G. (2007). *xUnit test patterns: Refactoring test code*.
    Addison-Wesley.

Freeman, S., & Pryce, N. (2009). *Growing object-oriented software, guided
    by tests*. Addison-Wesley.

Beck, K. (2002). *Test driven development: By example*. Addison-Wesley.
