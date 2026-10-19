# Memory bank local — Backend (BFF) de garantías Indurama

Archivo personal (excluido de git vía `.git/info/exclude`). Complementa, no reemplaza, al
[README](README.md), al [estándar NestJS](docs/estandar-desarrollo-nodejs-nestjs.md), a la
[matriz corporativa](docs/matriz-corporativa-stack-tec-admitido-v2.1.md) y a los
[pendientes](docs/PENDIENTES.md): leerlos antes de cambios no triviales.

## Qué es

BFF NestJS (Node 24, TypeScript strict) entre el micrositio (`../Garatias-Indurama-Front`) y:
- **Creatio** (CRM): OAuth 2.0 client credentials + OData v4 y servicios `/0/rest`.
- **Azure OpenAI**: lectura estructurada de la factura (visión).

Es la **fuente de verdad** de los contratos: el front se adapta a esta API.

## Comandos

```bash
npm run start:dev
npm run typecheck && npm run lint && npm run format:check
npm test              # unitarios (130 al 2026-10-08)
npm run test:e2e      # e2e con Creatio/OpenAI reemplazados por dobles (54)
```

Verificación mínima antes de dar algo por terminado: typecheck, lint, unitarios **y** e2e.

## Estructura (regla acordada)

- `src/features/<feature>/`: en la raíz **solo** `*.module.ts`, `*.controller.ts`, `*.service.ts`
  (+ `.spec`). Todo lo demás en carpetas: `dto/`, `errors/` y una carpeta por sistema externo con
  su contrato (`creatio/` para schema/mapper OData, `openai/` para prompt/schema/mapper).
- `src/infrastructure/{creatio,openai}/`: clientes técnicos reutilizables (no son repositorios).
- `src/common/`: errores base, filtro, interceptor, decoradores, pipes, `invoice-file/` (compartido).
- Organización por feature, **no** por capa técnica (sin carpetas `controllers/`, `services/`).
- `<feature>.repository.ts` solo si el service empieza a mezclar reglas de negocio con armado de
  OData; nunca un repositorio vacío.
- Al mover archivos: `git mv` (conserva historial) y actualizar el árbol del README.

## Convenciones de código

- Controller: solo HTTP (rutas, params, códigos, Swagger). Service: reglas y llamadas externas;
  no conoce `Request`/`Response`.
- Respuestas envueltas por `ResponseStructureInterceptor`; mensaje con `@ResponseMessage(...)`.
  Swagger con `@ApiResponseStructure` y `@ApiErrorResponses`.
- Errores: subclases de `AppError` con `code` + `category`. `Validation` → 422,
  `ExternalService` → 500 con mensaje genérico; el `code` interno solo va a logs.
- Nunca loguear cuerpos, headers ni el error crudo de axios (datos personales y tokens).
- Validación de entrada con class-validator + `@Transform(trim)`; respuestas externas con zod.
- Sin magic numbers: constantes nombradas. Líneas ≤ 120 caracteres (Prettier).
- JSDoc en español con `@author` y `@since` en clases/funciones públicas (autor: `Esteban` para
  código propio).
- Nombres de métodos descriptivos, no genéricos (`requestWithAuthRetry`, `sendWithBearerToken`,
  `toExternalServiceError`, `callRestService`; no `send`/`execute`/`translate`).
- **Caché de lecturas costosas a sistemas externos:** `common/cache/ttl-cache.ts` (`TtlCache<T>`),
  en memoria con TTL por entrada y barrido periódico (`OnModuleDestroy` limpia el timer). Se
  registra como provider con token (`Symbol`) vía `useFactory` en el módulo del feature, con el TTL
  como constante nombrada en `<feature>.constants.ts`; el service la recibe con `@Inject(TOKEN)`.
  Ejemplo: `features/products` cachea el producto por serie 1h (`PRODUCT_CACHE`,
  `products.constants.ts`). Solo se cachean resultados exitosos, nunca "no encontrado". Mismo
  trade-off que el rate limiting: vive por instancia, no se invalida entre instancias (ver
  PENDIENTES). En tests e2e que reutilizan la misma `app` entre casos, cada caso de un recurso
  cacheable necesita su propio id/serie para no pisar la caché de otro caso.

## Creatio

- `CreatioAuthClient`: token en memoria, renovado 30 s antes de vencer, renovaciones concurrentes
  unificadas; `invalidateToken()` ante 401.
- `CreatioODataClient`: `get/post/putBinary/delete/callRestService`; un único reintento ante 401;
  4xx → `CREATIO_REJECTED_REQUEST`, resto → `CREATIO_UNAVAILABLE`.
- **Columnas lookup en OData v4: se leen y escriben con el sufijo `Id`** y el GUID del registro
  relacionado (`Country` → `CountryId`, `Region` → `RegionId`, `City` → `CityId`, `INDOrigen` →
  `INDOrigenId`). El nombre sin `Id` es la navegación al objeto, no sirve para enviar el valor. Ante
  una columna lookup nueva, usar `<Columna>Id` y confirmarla en `GET /0/odata/$metadata`.
- Los DTO de clientes usan los nombres de columna de Creatio tal cual (incluido el sufijo `Id`), sin
  traducción entre contrato y CRM.
- **Valores fijos de lookup** (p. ej. origen "QR Garantía" = `5d40eb98-efc9-41e0-99c4-828014b9a01f`
  en `INDOrigenCliente`): constante nombrada en el `creatio/*.schema.ts` del feature, agregada por
  el service al payload; nunca se acepta en el body ni se devuelve en la respuesta.
- **Flujo atómico (2026-10-08):** el cliente nuevo NO se crea en el paso 1; `POST /v1/warranties` recibe
  `clientId` (existente) o `newClient[...]` (nuevo) y crea cuenta + garantía + adjunto en un request, con
  compensación (borra lo creado, incluida la cuenta nueva). Un cliente existente no edita datos: solo se le
  marcan `INDPP`/`INDTyC` pendientes. `PATCH /v1/clients/:id` se eliminó; `POST /v1/clients` se mantiene.
- La garantía se registra como `INDProductoEnCliente` (apunta a la cuenta y al producto, con
  `INDGarantiaId` = "Garantía" `f065d915-9741-4530-886e-1fd2fd802244`). El adjunto
  `INDProductoEnClienteFile` todavía es **provisional** (ver PENDIENTES).

## Git

- Commits: `tipo(número_de_tarea): descripción` en español (matriz §9.8). Tipos: feat, fix, docs,
  style, refactor, test, chore. Sin número de tarea: `tipo: descripción`.
- **Nunca** agregar a Claude como autor/coautor (sin `Co-Authored-By`, sin "Generated with Claude
  Code" en PRs).
- Commits chicos y por tema; separar refactors de cambios funcionales aunque toquen el mismo archivo.
- El repo es compartido (también commitea Cristian Brito): no reescribir historial ya publicado.
- Commitear o pushear solo cuando el usuario lo pide. `.env` nunca se versiona.

## Trampas del entorno

- El shell tiene `NODE_ENV=production` global: usar `npm ci --include=dev`.
- Windows + `core.autocrlf`: los avisos "LF will be replaced by CRLF" son ruido.
