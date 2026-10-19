# Estándar de Desarrollo — Node.js, TypeScript y NestJS

**Versión:** 1.0 · **Propietario:** Arquitectura Empresarial · **Última actualización:** 2026/08/07 · **Próxima revisión programada:** Revisión periódica alineada a la política semestral de baseline tecnológico (matriz, sección 10) · **Documento base:** Matriz corporativa de stack tecnológico admitido v2.2 (sección 5.2)

## Historial de versiones

| Versión | Fecha      | Autor      | Cambios                     |
| ------- | ---------- | ---------- | ---------------------------- |
| 1.0     | 2026/08/07 | CFERNANDEZ | Creación inicial del documento. |

**Stack:** Node.js LTS · TypeScript · NestJS · ORM a definición del proyecto (p. ej. TypeORM, Prisma) · Contenedor OCI

> Esta guía complementa la Matriz corporativa de stack tecnológico admitido (en especial las secciones 4, 5.2, 8, 9 y 10). Ante cualquier conflicto entre este documento y la matriz, **prevalece la matriz**.

---

## Cómo usar este documento

Este documento es una **guía y estándar de desarrollo**: define cómo debe escribirse el código nuevo y qué reglas son obligatorias o recomendadas en todo proyecto backend construido con Node.js, TypeScript y NestJS.

### Clasificación de reglas

- **[MUST]** — obligatorio.
- **[SHOULD]** — recomendado; su ausencia debe justificarse.
- **[GATE]** — verificable de forma automática (linter, compilador o pipeline de CI/CD), no depende del criterio humano.

---

## 1. Principios

### MUST
- **SOLID**: los cinco principios de diseño orientado a objetos (responsabilidad única, abierto/cerrado, sustitución de Liskov, segregación de interfaces, inversión de dependencias) que hacen el código más mantenible y extensible.
- **DRY** (*Don't Repeat Yourself*): no duplicar lógica; cada conocimiento del sistema vive en un solo lugar.
- **Clean Code**: código que se lee como prosa clara, con nombres significativos, sin necesitar comentarios para entender qué hace.
- **Seguridad por defecto** (*secure by default*): la opción segura ocurre automáticamente; no depende de que el desarrollador se acuerde de activarla.
- **Bajo acoplamiento, alta cohesión**: los módulos dependen lo mínimo posible entre sí, y cada uno agrupa responsabilidades relacionadas.

### SHOULD
- **KISS** (*Keep It Simple*): preferir siempre la solución más simple que resuelva el problema, sin complejidad de más.
- **YAGNI** (*You Aren't Gonna Need It*): no construir algo "por si se necesita después"; solo lo que el requerimiento actual pide.
- **Código expresivo**: se entiende leyéndolo, sin depender de comentarios que expliquen qué hace.
- **Métodos pequeños**: cada método resuelve una sola tarea y se lee sin necesidad de hacer scroll.
- **Reutilización antes que reescritura**: antes de crear código nuevo, revisar si ya existe algo reutilizable equivalente.

> La complejidad arquitectónica debe responder a la complejidad real del dominio, nunca imponerse por defecto. Un patrón (Aggregate, Domain Event, Factory, Value Object) solo se introduce cuando resuelve un problema presente, no uno hipotético.

---

## 2. Selección de Arquitectura

Ver también la sección 3 de la matriz corporativa (monolito modular vs. microservicios). Dentro de un módulo o servicio, la decisión de estilo interno se documenta y se registra en el propio módulo.

### 2.1 Arquitectura por capas (módulo NestJS estándar) — usar cuando:
- El módulo es principalmente CRUD.
- La lógica de negocio es simple.
- Depende de un único repositorio o fuente de datos.
- No hay integraciones externas complejas.

```
Controller → Service → Repository → Base de datos
```

### 2.2 Arquitectura Hexagonal (Ports & Adapters) — usar cuando:
- Existen reglas de negocio complejas.
- Hay múltiples integraciones o proveedores externos.
- El proceso de negocio debe permanecer aislado de la infraestructura.
- Se requiere alta testeabilidad del núcleo.

**Modelo de dependencias (todas apuntan hacia el dominio):**

```
        Inbound Adapters                 Outbound Adapters
     (Controllers NestJS, CLI)      (ORM, APIs externas, colas)
              │                                  ▲
              ▼                                  │
        ┌─────────────────────────────────────────────┐
        │            Application (Use Cases)           │
        │  ┌───────────────────────────────────────┐   │
        │  │   Domain (Entities, Rules, Services)  │   │
        │  │   posee los Ports (interfaces)        │   │
        │  └───────────────────────────────────────┘   │
        └─────────────────────────────────────────────┘
```

- Los **Ports** son interfaces que **pertenecen al núcleo**; no son una capa por debajo del dominio.
- Los adaptadores dependen del núcleo. **Nunca** el núcleo de los adaptadores.
- El dominio no importa nada de infraestructura (ni ORM, ni NestJS, ni clientes HTTP).

> No implementar DDD táctico completo solo porque el módulo es hexagonal. Aggregates, Domain Events, Value Objects y Factories se introducen únicamente cuando agregan valor.

**[MUST]** No mezclar ambos estilos dentro de un mismo módulo.

---

## 3. Organización del Proyecto

**Por capas (módulo NestJS estándar)**
```
src/
  <feature>/
    <feature>.module.ts
    <feature>.controller.ts
    <feature>.service.ts
    <feature>.repository.ts  # solo cuando el módulo accede a datos; no crear un repositorio vacío
    dto/
    entities/
  common/          # filtros de excepción, pipes, guards, interceptors compartidos
  config/          # configuración validada al arranque
```

**Hexagonal (módulos con lógica de negocio compleja)**
```
src/<feature>/
  domain/          # entities, value objects, domain services, ports
  application/     # use cases, DTOs, validadores
  infrastructure/  # controllers NestJS, repositorios, adaptadores externos
```

- **domain**: sin dependencias de infraestructura.
- **application**: casos de uso, DTOs, puertos de entrada. Sin SQL.
- **infrastructure**: controllers, ORM, clientes HTTP, mensajería.

**[SHOULD]** El directorio `dto/` puede subdividirse en `input/` y `output/` cuando el módulo maneja muchos contratos distintos de entrada y salida.

Carpetas y archivos en **kebab-case**.

---

## 4. Convenciones de Nombres

- **Idioma [MUST]:** el código se escribe en inglés. Prohibido el espanglish (`createCliente`, `deleteFactura`).
- **Excepción de dominio [SHOULD]:** términos de negocio sin equivalente claro en inglés pueden mantenerse en su forma original, siempre documentados y usados de forma consistente en todo el proyecto.
- **Variables:** `camelCase` → `customerId`, `paymentDate`.
- **Clases:** `PascalCase` → `UserService`, `PaymentController`.
- **Constantes:** `UPPER_SNAKE_CASE` → `JWT_EXPIRATION`, `MAX_LOGIN_ATTEMPTS`.
- **Enums / union types:** `PascalCase` → `OrderStatus.Pending`.
- **Archivos:** `kebab-case` → `user.service.ts`, `create-order.use-case.ts`.

### 4.1 Prefijos recomendados — [SHOULD]

| Elemento             | Estilo             | Ejemplo                              | Prefijos recomendados                                                                     |
| --------------------- | ------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| Funciones             | `camelCase`         | `getUserData()`, `calculateTotal()`  | `get`, `set`, `is`, `has`, `can`, `should`, `fetch`, `create`, `update`, `delete`, `validate`, `handle` |
| Variables booleanas    | `camelCase`         | `isLoading`, `hasPermission`         | `is`, `has`, `can`, `should`                                                                 |
| Constantes             | `UPPER_SNAKE_CASE`  | `API_BASE_URL`, `MAX_RETRY_ATTEMPTS` | `API_`, `MAX_`, `MIN_`, `DEFAULT_`, `CONFIG_`                                                |

### Interfaces e implementaciones — [MUST]
Una única convención. **Nunca** el mismo nombre para interfaz e implementación.

```
UserRepository            // interfaz (port, sin prefijo I)
TypeOrmUserRepository     // implementación de producción
MemoryUserRepository      // implementación para tests
```

---

## 5. Convenciones de TypeScript

Reglas específicas del stack, verificables por `tsconfig` y ESLint.

**[MUST] [GATE]**
- `strict: true` en `tsconfig` (incluye `strictNullChecks`, `noImplicitAny`, etc.).
- `any` **prohibido** salvo justificación explícita en comentario. Preferir `unknown` y estrechar el tipo.
- `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters` activos.
- **Cálculos financieros:** usar una librería de decimales (`decimal.js`, `big.js`) o enteros en la mínima unidad (centavos), nunca el tipo `number` nativo (pérdida de precisión en aritmética de punto flotante: `0.1 + 0.2 !== 0.3`).

**[SHOULD]**
- Evitar `as` (type assertion); si es inevitable, justificar. Preferir *type guards* y validación en runtime (`class-validator`, `zod`) en los bordes.
- `!` (non-null assertion) solo con justificación; preferir comprobaciones explícitas.
- Preferir *union types* / objetos `as const` sobre `enum` en general. Evitar `const enum`.
- Tipos de dominio explícitos; evitar tipos estructurales anónimos repetidos.

---

## 6. Documentación del Código

Instanciación en TypeScript de la sección 4.5 de la matriz corporativa (Documentación del código fuente): todo el código nuevo sigue el formato TSDoc/JSDoc descrito ahí, aplicado así en este stack.

**[MUST]**
- Documentar toda clase, servicio, controlador y método público, salvo código simple y autoexplicativo (matriz, sección 4.5).
- La primera línea responde, en una sola frase de máximo 80 caracteres, qué es, para qué sirve y por qué existe.
- El bloque completo no supera las 200 palabras (matriz, sección 4.5).
- Etiquetas `@author` y `@since` obligatorias (matriz, sección 4.5: cuando el estándar de documentación del lenguaje contempla etiquetas de autoría, su uso es obligatorio, sin excepción por equipo o proyecto).

```typescript
/**
 * Calcula el total de una orden aplicando descuentos e impuestos.
 *
 * Centraliza la lógica de precios para evitar duplicarla entre
 * el checkout y el recálculo de órdenes existentes.
 *
 * @param order - Orden con sus líneas de detalle
 * @param options - Reglas de descuento e impuesto aplicables
 * @returns Total final de la orden
 * @throws {InvalidOrderError} Si la orden no tiene líneas
 * @author J. Paucay
 * @since 2026-08-07
 */
async function calculateOrderTotal(order: Order, options: PricingOptions): Promise<Money> {
  // ...
}
```

**[SHOULD]**
- Documentar constantes exportadas con una frase que explique **qué representan**, no cómo se usan.

---

## 7. Estilo y Formato

**[MUST] [GATE]**
- Cada línea de código no debe superar los **120 caracteres**.
- **Prettier** como formateador único, con configuración acordada por el equipo y versionada en el repositorio (`.prettierrc`). Configuración de referencia:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 120,
  "tabWidth": 2,
  "arrowParens": "avoid"
}
```

- **ESLint** sin errores, conforme al perfil de calidad asignado al proyecto.

**[SHOULD]**
- Hooks de pre-commit (p. ej. Husky) que ejecuten lint y el escaneo de secretos (sección 12.2) antes de cada commit.

---

## 8. Calidad del Código

- **Responsabilidad única [MUST]:** cada clase, un solo propósito.
- **Código muerto [GATE]:** sin imports, variables o funciones sin uso; sin código comentado.
- **Magic numbers [MUST]:** todo valor con significado va a una constante nombrada.
- **Valores hardcodeados [MUST]:** prohibido hardcodear URLs, puertos, tokens, secretos, certificados, credenciales, rutas absolutas, nombres de ambiente o de empresa. Todo desde configuración.
- **Análisis estático [GATE]:** el código se analiza con el **Quality Profile por defecto de SonarQube** de la instancia corporativa (complejidad, duplicación, code smells, bugs, vulnerabilidades — mapeadas a OWASP Top 10, CWE, SANS Top 25). El pipeline **bloquea el merge** según el **Quality Gate** asignado al proyecto (alineado a criticidad, no necesariamente el gate por defecto de SonarQube). La **cobertura** se rige por la sección 9.6 de la matriz.

> El tamaño de función no es una regla dura por líneas; la métrica la determina el Quality Profile de SonarQube, no el conteo manual.

---

## 9. Deuda Técnica

**[MUST]**
- Un `TODO` o `FIXME` **solo se permite si referencia un ticket rastreable**:

```
// TODO(#1234): descripción
// FIXME(JIRA-212): descripción
```

- **Prohibido** un `TODO` o `FIXME` "huérfano" sin identificador.

---

## 10. Programación Asíncrona y Trabajos por Lotes

Reglas críticas en Node.

**[MUST]**
- **No ignorar promesas.** Toda promesa se espera con `await`, se encadena, o se marca deliberadamente con `void` **con** manejo de error. Prohibido el *floating promise* silencioso.
- Todo `await` vive dentro de un contexto con manejo de error (try/catch o filtro de excepciones de NestJS).
- No dejar `async` sin `await` cuando no aporta valor.
- **Todo bucle no acotado estructuralmente** (`while`/`do-while` cuya condición se evalúa en runtime, recursión) **debe tener un control que evite ejecución infinita** (límite de iteraciones o timeout), incluso cuando la condición de salida "siempre" debería cumplirse. No aplica a iteración ya acotada por definición (`for`/`for...of` sobre un array o colección de tamaño conocido).

```typescript
// Ejemplo dentro de una capa NestJS (controller/service). En dominio/aplicación
// de un módulo hexagonal, lanzar una excepción propia del proyecto en su lugar,
// sin depender de las clases HTTP de NestJS.
let iterations = 0;
while (condition && iterations < MAX_ITERATIONS) {
  processItem();
  iterations++;
}
if (iterations >= MAX_ITERATIONS) {
  throw new InternalServerErrorException('Límite máximo de iteraciones alcanzado');
}
```

**[SHOULD]**
- Evitar `await` secuencial dentro de un `for` cuando las operaciones son **independientes**; paralelizar con `Promise.all` / `Promise.allSettled`.
  - **Excepción [MUST]:** la paralelización **nunca** cruza una frontera transaccional, ni se aplica a operaciones con orden significativo sobre el mismo recurso (p. ej. escrituras concurrentes sobre el mismo registro). Ante la duda, secuencial.
- Usar `Promise.all` cuando cualquier fallo debe abortar todo; `Promise.allSettled` cuando se necesitan todos los resultados aunque alguno falle. No confundirlos.
- **Trabajos programados (`@nestjs/schedule` u otro cron):** prevenir ejecución concurrente entre instancias mediante un lock distribuido (p. ej. Redis); diseñar el proceso para poder detenerse, reiniciar desde el último punto y reprocesar registros fallidos.
  - **Alcance [MUST]:** esto cubre tareas programadas livianas (notificaciones, sincronizaciones periódicas simples). La matriz corporativa (sección 5.2) indica que Node.js **no es la opción preferente** para procesos batch complejos, procesamiento intensivo de CPU ni transacciones distribuidas; un proceso batch de ese tipo debe evaluarse en Java (matriz, sección 5.1), no implementarse en Node por conveniencia.

---

## 11. Performance

**[SHOULD]** — revisar en el PR:
- Consultas repetidas que podrían resolverse en una sola.
- Loops innecesarios o anidados sobre colecciones grandes.
- Múltiples llamadas al mismo servicio que podrían agruparse.
- Consultas N+1 (ver sección 16).
- Uso de caché cuando la lectura sea frecuente y el dato tolere staleness; invalidación definida.

> Performance no es optimización prematura: se revisa el *patrón* (N+1, llamadas redundantes), no microsegundos.

---

## 12. Seguridad

### 12.1 Secretos [MUST]
- Nunca en código, commits ni repositorio. Origen exclusivo: el gestor corporativo de secretos (matriz, sección 9.7).
- Los archivos `.env` con secretos no deben commitearse; deben estar en `.gitignore` (matriz, sección 9.7).

### 12.2 Escaneo de secretos
- **CI/CD [MUST] [GATE]:** `gitleaks` o `trufflehog`, bloqueante (matriz, sección 9.2).
- **Pre-commit [SHOULD]:** el mismo escaneo localmente antes de cada commit (p. ej. con Husky, sección 7), como red de seguridad temprana — no sustituye el control obligatorio de CI.

### 12.3 Passwords [MUST]
- Solo `bcrypt` o `argon2` cuando la aplicación gestione contraseñas propias. Prohibido MD5, SHA1, Base64 como "hashing".

### 12.4 Inyección (SQL y NoSQL) [MUST]
- Principio: **consultas parametrizadas**, no "usar un ORM". Prohibido concatenar o interpolar strings en SQL, incluso vía funciones de consulta cruda del ORM.
- El mismo principio aplica a bases NoSQL: prohibido pasar objetos de entrada del usuario directamente como filtro de consulta sin validar su forma. Un operador como `$ne` u otro operador de consulta inyectado vía body puede alterar la condición de búsqueda si no se valida el esquema de entrada.

### 12.5 Validación de entrada [MUST]
- Toda entrada se valida con `class-validator` (pipes de NestJS) o `zod`. Nunca confiar en frontend, cliente o gateway.

### 12.6 Identidad [MUST]
- Integración con el servicio corporativo de identidad conforme a OAuth 2.0 / OpenID Connect (matriz, sección 9.4). **La validación del token se realiza mediante el mecanismo que exponga la plataforma de identidad corporativa** — validación local del JWT contra JWKS (expiración, issuer, audience, algoritmo; rechazar `alg: none`), o consulta a un servicio corporativo de validación/introspección. Confirmar con Arquitectura Empresarial cuál mecanismo expone el IAM antes de implementar.
- **Prohibido** implementar un mecanismo propio de autenticación (registro/login/hash de contraseñas propio) sin aprobación explícita; la matriz exige integrarse con el IAM corporativo, no reemplazarlo.
- **[SHOULD]** rotación de refresh tokens; revocación/blacklist cuando corresponda.

### 12.7 Hardening HTTP [MUST]
- `helmet()` o equivalente.
- CORS con **whitelist** explícita (nunca `origin: "*"`).
- HTTPS/TLS forzado en producción.
- Límite de tamaño del body (DoS por payload gigante).

### 12.8 Rate Limiting [MUST]
- Obligatorio en `login`, `auth` y endpoints públicos, con límite y ventana por endpoint.
- **[MUST]** con múltiples instancias, usar store compartido (Redis).

### 12.9 Manejo de errores [MUST]
- Nunca retornar stack traces ni errores internos al cliente; el detalle solo en logs. Errores de negocio con excepciones tipadas y un filtro de excepciones centralizado (`@Catch()`/`ExceptionFilter`); prohibido `catch(e){}` vacío.
- **Excepciones tipadas por categoría:** NestJS ya provee clases estándar en `@nestjs/common` para los casos comunes — `BadRequestException` (datos inválidos), `NotFoundException` (recurso no encontrado), `ForbiddenException` (acceso no autorizado), `InternalServerErrorException` (error general). Usar estas antes de crear excepciones propias paralelas; una excepción de dominio adicional solo se crea cuando ninguna clase estándar representa el caso.
- Un `try/catch` debe estar **justificado**: manejo de recursos externos, operaciones que pueden fallar esperadamente, o conversión de una excepción de una librería a una excepción tipada del proyecto. No usarlo de forma indiscriminada envolviendo bloques enteros "por si acaso".

### 12.10 Base de datos [SHOULD]
- Usuario de aplicación con **privilegios mínimos** (sin DDL en producción).

---

## 13. Configuración [MUST]
- Centralizada mediante el módulo de configuración de NestJS (`ConfigModule`).
- Variables de entorno **validadas al arranque** con `class-validator`/`zod`/`envalid`.
- Si falta o es inválida una variable obligatoria, la aplicación **falla inmediatamente** (fail-fast).

---

## 14. Capas de Aplicación

- **Controllers [MUST]:** solo reciben request, delegan al servicio/caso de uso y responden. Sin lógica de negocio.
- **Providers/Services [MUST]:** encapsulan la lógica de aplicación.
- **Repositories [MUST]:** solo acceso a datos. Sin reglas de negocio, cálculos ni validaciones.
- **DTO [MUST]:** todo endpoint usa DTO de entrada y salida, validado. Nunca exponer entidades directamente.
- **Guards, Interceptors y Pipes [SHOULD]:** responsabilidad única; manejo global de errores centralizado en un filtro de excepciones.

---

## 15. API REST y Versionado

### 15.1 Principios generales — [MUST]
- Cada endpoint tiene una única responsabilidad; un endpoint de consulta (`GET`) nunca modifica datos.
- La API es clara, consistente y predecible en su estructura.

### 15.2 Métodos HTTP permitidos — [MUST]

Se usará de preferencia **`GET`** y **`POST`**. El uso de `PUT`, `PATCH` o `DELETE` deberá ser **aprobado** (Arquitectura Empresarial o el responsable técnico definido por el proyecto) antes de incorporarse al contrato de la API.

| Método   | Uso                                                          | Aprobación previa |
| -------- | -------------------------------------------------------------- | ------------------ |
| `GET`    | Obtener información. **Nunca** modifica datos.                | No requiere        |
| `POST`   | Crear un recurso, u operaciones complejas que requieren body. | No requiere        |
| `PUT`    | Actualizar completamente un recurso.                          | **Requerida**       |
| `PATCH`  | Actualizar parcialmente un recurso.                            | **Requerida**       |
| `DELETE` | Eliminar un recurso.                                           | **Requerida**       |

### 15.3 Códigos de respuesta — [MUST]

| Código | Significado             |
| ------ | -------------------------- |
| 200    | Respuesta exitosa.         |
| 201    | Recurso creado.            |
| 204    | Éxito sin contenido (p. ej. `DELETE`). |
| 400    | Error en los parámetros enviados. |
| 401    | No autenticado.            |
| 403    | No autorizado.             |
| 404    | Recurso no encontrado.     |
| 422    | Errores de validación.     |
| 500    | Error inesperado del servidor. |

### 15.4 Eliminación de datos — [MUST]
- No debe existir eliminación física a menos que sea estrictamente necesaria y solicitada explícitamente por el negocio. Preferir un **estado de inactividad** (`active: true/false` o `status`). Si el proyecto requiere eliminación física, debe documentarse y justificarse.

### 15.5 Datos sensibles [MUST]
- No enviar datos sensibles por `query params`. Ver también la sección 12.5 (validación de entrada).

### 15.6 Versionado [MUST]
- **No romper contratos públicos.** Un cambio incompatible requiere una **nueva versión** de la API (`/v1`, `/v2` o versionado por header), conforme a la sección 8 de la matriz corporativa.
- Los cambios compatibles hacia atrás no requieren nueva versión.
- Una versión pública en uso no se modifica de forma incompatible; se deprecia con período de transición documentado.

### 15.7 Estructura de respuesta — [MUST]

Toda respuesta de la API **con body** usa el envoltorio **`ResponseStructure<T>`**, unificado con el mismo patrón adoptado en Java y Python (mismo nombre de campos, adaptado a la convención de nombres de cada lenguaje). **Excepción:** `204 No Content` nunca lleva body, por definición del protocolo HTTP; no aplica `ResponseStructure` ahí.

```typescript
interface ResponseStructure<T> {
  data: T | null;
  message: string;
  error: string | null;
  statusCode: number;
}
```

**Ejemplo de respuesta exitosa:**
```json
{
  "data": { "orderId": 123, "total": 150.00 },
  "message": "Operación exitosa",
  "error": null,
  "statusCode": 200
}
```

**Ejemplo de respuesta con error:**
```json
{
  "data": null,
  "message": "Orden no encontrada",
  "error": "NOT_FOUND",
  "statusCode": 404
}
```

Se construye de forma centralizada (p. ej. en el filtro de excepciones y en un interceptor de respuesta), no repetida a mano en cada controller.

#### Significado de cada campo — [MUST]

- **`message`** — texto **de negocio/usuario**: una frase legible que cualquier consumidor de la API puede mostrar tal cual (p. ej. *"Orden no encontrada"*). Nunca contiene detalle técnico.
- **`error`** — detalle o **código técnico**, pensado para diagnóstico (logs, herramienta de monitoreo de errores, soporte), no el texto crudo de una excepción. `null` en éxito.
- **`data`** — el payload de la operación (o `null` en error).
- **`statusCode`** — el código HTTP, duplicado en el body para clientes que no inspeccionan headers.

> **No exponer el mensaje crudo de una excepción (`error.message`) al cliente en `error`.** Filtra detalle interno (stack, nombres de driver, fragmentos de query) y contradice la regla de seguridad de la sección 12.9. El detalle crudo va a logs/monitoreo; lo que se expone en `error` hacia el cliente debe ser un **código o categoría estable** (p. ej. `"NOT_FOUND"`, `"DATABASE_ERROR"`).

### 15.8 Documentación — [MUST]
- Documentar el contrato con **OpenAPI 3.x** y mantenerlo sincronizado con el código, registrado en el catálogo corporativo de APIs (matriz, sección 8: API-first y OpenAPI 3.x obligatorios).

### 15.9 Idempotencia, filtrado/ordenamiento y timeouts — [MUST]

Requisitos de la sección 8 de la matriz corporativa, aplicados a este stack:

- **Idempotencia cuando corresponda:** todo endpoint que cree, pague o mueva un recurso de forma no segura de reintentar (p. ej. `POST` de creación, pagos, notificaciones) acepta una **clave de idempotencia** (`Idempotency-Key`) y garantiza que un reintento con la misma clave no duplique la operación.
- **Filtrado y ordenamiento normalizados:** listados exponen parámetros de query consistentes en todos los endpoints (p. ej. `filter[campo]`, `sort=campo,-otroCampo`), no una convención distinta por módulo.
- **Timeouts en llamadas externas:** todo cliente HTTP hacia otro servicio (interno o externo) tiene un `timeout` configurado explícitamente; prohibido dejar el valor por defecto del cliente sin revisar.

---

## 16. Persistencia y Acceso a Datos

**[MUST]**
- Migraciones para todo cambio de esquema; prohibido modificar el esquema manualmente en producción.
- Claves foráneas e índices adecuados.
- Paginación obligatoria en listados.
- Operaciones que modifiquen múltiples registros relacionados se ejecutan dentro de una **transacción**.

**[SHOULD]**
- Relaciones explícitas; carga diferida (*lazy loading*) solo cuando se justifique.
- Evitar consultas N+1 y consultas innecesarias.
- Proyectar únicamente los campos necesarios en consultas de lectura cuando el volumen de datos lo justifique.

---

## 17. Observabilidad

**[MUST]**
- Logger centralizado (p. ej. Winston, Pino). Prohibido `console.log` en producción.
- Logging **estructurado (JSON)**, instrumentado con OpenTelemetry (matriz, sección 9.5).
- **Correlation ID / Request ID** propagado por request.
- Nunca registrar: passwords, `Authorization`, JWT, cookies, certificados. Cuando un dato sensible deba aparecer para trazabilidad, enmascararlo (p. ej. últimos 4 dígitos de una tarjeta).
- **Sanitización (prevención de Log Forging):** los datos de entrada del usuario que se incluyan en un mensaje de log se sanitizan antes de registrarse (eliminar saltos de línea y tabulaciones), para evitar que un usuario malicioso falsifique entradas de log.
- **Prevención de logs repetitivos:** no registrar un log por cada iteración de un proceso masivo (loops de miles/millones de registros). Registrar un **resumen** (procesados/errores/total) al finalizar, y opcionalmente progreso cada *N* registros; agrupar errores repetidos por tipo en vez de logear cada ocurrencia.

### 17.1 Niveles de log — [MUST]

| Situación                        | Nivel            |
| --------------------------------- | ---------------- |
| Error / excepción                 | `logger.error()` |
| Advertencia recuperable           | `logger.warn()`  |
| Evento informativo de negocio     | `logger.info()`  |
| Detalle de diagnóstico            | `logger.debug()` |

- **Prohibido** `logger.info(error)` cuando corresponde `logger.error(error)`.
- El nivel `debug` no debe estar activo por defecto en producción.

### 17.2 Health checks [MUST]
- `/health` con readiness y liveness probes (matriz, sección 9.1: toda imagen OCI debe incluir health checks).

---

## 18. Docker

**[MUST]**
- Usuario **no root** dedicado.
- Imágenes oficiales; `.dockerignore` presente.
- Variables sensibles fuera de la imagen.
- **Generar un SBOM** (*Software Bill of Materials*) de la imagen (matriz, sección 9.1) e integrarlo al pipeline de CI/CD.

**[SHOULD]**
- Dockerfile optimizado (multi-stage, caché, mínimas capas).
- **Graceful shutdown**: manejar `SIGTERM` y cerrar transacciones/conexiones antes de terminar.

---

## 19. Dependencias

**[GATE]**
- Lockfile obligatorio del gestor de paquetes aprobado por el proyecto (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock` o equivalente).
- Análisis de vulnerabilidades en CI (`npm audit` u homólogo del gestor elegido).
- Escaneo automático (Dependabot **o** Renovate — uno, no ambos).

**[SHOULD]**
- Revisión de toda dependencia nueva en el PR: ¿necesaria? ¿mantenida? ¿licencia compatible?
- Eliminar paquetes sin uso o abandonados.

---

## 20. Testing

**[MUST]**
- Unitarias, de integración y end-to-end conforme a la sección 9.6 de la matriz corporativa, según el nivel de criticidad del proyecto — no se redefine aquí un criterio distinto.
- Unitarias y de integración con `Jest` o `Vitest` (integración de endpoints HTTP p. ej. con Supertest).

**[GATE]**
- Cobertura mínima conforme a la sección 9.6 de la matriz corporativa, según el nivel de criticidad de la aplicación.
- El merge se **bloquea** si hay tests fallidos, no se alcanza la cobertura o no compila.

> La cobertura mide qué código se ejecutó, no si las aserciones son correctas. La revisión verifica que los tests **aseveren comportamiento**, no que solo toquen líneas.

---

## 21. Control de Versiones y CI/CD

Ver sección 9.8 de la matriz corporativa para nomenclatura de ramas, commits y flujo de merge. El pipeline debe cumplir íntegramente la **sección 9.2 de la matriz** (compilación, pruebas con cobertura, análisis estático, análisis de dependencias, detección de secretos, construcción y escaneo de imágenes, SBOM, despliegue, pruebas post-despliegue, rollback; sin despliegues manuales a producción).

**[GATE]** Adicionalmente, específico de este stack:
1. Type check (TypeScript `strict` sin errores).
2. Lint (ESLint) y formato (Prettier).
3. Análisis estático con SonarQube (Quality Profile de la instancia corporativa, sección 8).

---

## 22. Glosario

- **Port**: interfaz que el núcleo (dominio/aplicación) define para comunicarse con el exterior; la posee el núcleo, no la infraestructura.
- **Adapter**: implementación concreta de un port; traduce entre el núcleo y una tecnología externa.
- **Aggregate**: grupo de entidades y value objects tratado como una unidad de consistencia, con una raíz que controla el acceso.
- **Value Object**: objeto definido por su valor, no por identidad, inmutable.
- **Idempotencia**: propiedad por la cual ejecutar la misma operación varias veces produce el mismo resultado que ejecutarla una sola vez.
- **Correlation ID**: identificador que se propaga a través de servicios/logs para rastrear una misma operación de punta a punta.
- **Readiness (probe)**: comprobación de si la aplicación está lista para **recibir tráfico**.
- **Liveness (probe)**: comprobación de si la aplicación **sigue viva** o debe reiniciarse.
- **N+1**: antipatrón donde una consulta desencadena N consultas adicionales en vez de resolverlo en un único acceso.
- **Floating promise**: promesa cuyo resultado y errores no se esperan ni manejan.

---

## Conclusión

La calidad del software no depende de que el código "funcione", sino de que sea seguro, consistente y mantenible. Este documento define las reglas mínimas obligatorias para todo desarrollo backend con Node.js, TypeScript y NestJS dentro del catálogo tecnológico corporativo. Toda excepción a un **[MUST]** debe justificarse técnicamente y aprobarse en revisión de código.
