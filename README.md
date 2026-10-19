# Warranty Registration BFF

Intermediario (Backend for Frontend) **sin estado** del micrositio de registro de garantías de Indurama. Recibe el
formulario y la factura del cliente, lee la factura con **Azure OpenAI (visión)** y registra la garantía, con la factura
adjunta, en **Creatio (CRM)** por OData v4. No tiene base de datos: toda la información de negocio reside en Creatio.

|                                    |                                                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Criticidad**                     | Por confirmar con Arquitectura Empresarial (los umbrales de cobertura de `jest.config.ts` asumen **media**) |
| **Propietario funcional**          | Por definir                                                                                                 |
| **Equipo / proveedor responsable** | Por definir                                                                                                 |
| **Stack**                          | Node.js 24 LTS · TypeScript 5.9 (`strict`) · NestJS 11 · Contenedor OCI                                     |

## Arquitectura

```
Cliente ─► [WAF / rate limit] ─► BFF (este servicio) ─┬─► Azure OpenAI (visión)   lectura de factura
                                                      └─► Creatio (OAuth 2.0 + OData v4)   garantía + adjunto
```

Cada feature (`clients`, `invoice-extraction`, `products`, `warranties`) vive en `src/features/` y usa **arquitectura por capas** (`Controller → Service`; el servicio es quien llama al sistema externo). Las integraciones y la recepción del archivo son módulos aparte que la feature importa por inyección de dependencias.

Todas las features siguen la misma regla: en la raíz solo `module`, `controller` y `service`; lo demás va en carpetas (`dto/`, `errors/` y una carpeta por sistema externo con su contrato: `creatio/` u `openai/`).

```
src/
  features/          un módulo Nest por caso de uso expuesto por la API
    clients/         ClientsModule: consulta y registro de clientes de Creatio (exporta ClientsService a warranties)
      clients.controller.ts          solo HTTP; GET /v1/clients/:identification
      clients.service.ts             busca la cuenta en Creatio (OData) y responde 404 si no existe
      creatio/                       entidad y columnas de Creatio de la cuenta (cliente)
      dto/  errors/                  contratos y errores
    invoice-extraction/  InvoiceExtractionModule: lectura de la factura con Azure OpenAI
      invoice-extraction.controller.ts   solo HTTP; ruta /v1/warranties/invoice-extraction (contrato existente)
      invoice-extraction.service.ts      arma el pedido a OpenAiService y aplica las reglas de la factura
      openai/                        prompt, esquema de salida pedido al modelo y mapper a la respuesta
      dto/  errors/                  respuesta y factura ilegible
    products/        ProductsModule: consulta del producto de Creatio que corresponde a un número de serie
      products.controller.ts         solo HTTP; GET /v1/products/serial/:serialNumber
      products.service.ts            consulta el servicio de serie de Creatio (que pregunta a SAP), responde 404 si no
                                      existe y cachea en memoria el producto encontrado por 1 hora (`products.constants.ts`)
      creatio/                       contrato del servicio ConsultarPorSerie de Creatio
      dto/                           parámetros de ruta y respuesta
    warranties/      WarrantiesModule: registro de la garantía
      warranties.controller.ts       solo HTTP: rutas, parámetros, códigos de respuesta y Swagger; delega en el service
      warranties.service.ts          crea la cuenta del cliente nuevo (vía ClientsService), el producto de cliente
                                      (INDProductoEnCliente) y adjunta la factura (idempotente, con compensación)
      creatio/                       entidades y columnas de Creatio de la garantía; mapper formulario → payload OData
      dto/  errors/                  contratos y errores del registro
  common/            errores base, filtro de excepciones, interceptor ResponseStructure, decoradores, pipes
    cache/           TtlCache: caché en memoria con expiración y barrido periódico, reutilizable entre features
    invoice-file/    recepción de la factura, compartida por las features que la reciben: InvoiceFileModule (límites de
                     Multer), pipe de validación por contenido, InvoiceFile y tipos MIME admitidos
  config/            variables de entorno validadas al arranque (fail-fast)
  health/            /health/live y /health/ready
  infrastructure/    integraciones con sistemas externos, reutilizables por cualquier feature (un módulo Nest cada una)
    creatio/         CreatioModule: clientes OAuth 2.0 y OData v4 (exporta CreatioODataClient)
    openai/          OpenAiModule: OpenAiService, salida estructurada con Azure OpenAI (política de la llamada y errores)
```

| Capa       | Responsabilidad                                                                     | No debe                                               |
| ---------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Controller | Recibir la solicitud, validar parámetros, invocar al service y fijar el código HTTP | Contener lógica de negocio ni llamar a Creatio/OpenAI |
| Service    | Aplicar las reglas y hacer la solicitud a Creatio u OpenAI                          | Conocer `Request`/`Response` ni códigos HTTP          |

## API (`/v1`)

Contrato completo en OpenAPI: con `OPENAPI_DOCS_ENABLED=true` se publica en `/docs`. Toda respuesta con body usa
`ResponseStructure<T>` (`data`, `message`, `error`, `statusCode`).

| Método | Ruta                                | Descripción                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/v1/warranties/invoice-extraction` | `multipart/form-data` con `invoice` (JPEG, PNG, WebP o PDF). Devuelve los datos leídos para pre-llenar el formulario, más `scoreImage` (calidad de la imagen) y `scoreResult` (fiabilidad de la lectura), ambos de 0 a 1. Con `scoreResult` de 0.3 o menos responde `422 INVOICE_UNREADABLE`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `POST` | `/v1/warranties`                    | `multipart/form-data` con el cliente, `INDPP` e `INDTyC` (deben ser `true`), `productId` (`Id` del producto), `serialNumber`, `invoiceNumber`, `purchaseDate` (YYYY-MM-DD), `storeName` + `invoice`. El cliente va como `clientId` (`Id` de una cuenta existente; solo se le marcan los consentimientos pendientes, `404 CLIENT_NOT_FOUND` si no existe) **o** como `newClient[...]` con los mismos campos que `POST /v1/clients` sin los consentimientos (se crea su cuenta con origen "QR Garantía" en el mismo paso; `422 CLIENT_ALREADY_EXISTS` si otra cuenta tiene esa identificación), nunca ambos. Crea un `INDProductoEnCliente` con tipo de cobertura "Garantía" y le adjunta la factura; si algo falla elimina lo creado, incluida la cuenta nueva. Cabecera obligatoria `Idempotency-Key` (UUID v4), que es el `Id` de la garantía y de la cuenta nueva. `201` si crea; `200` si el reintento ya estaba registrado. |
| `GET`  | `/v1/clients/:identification`       | Busca en Creatio (`Account`) al cliente con esa cédula, RUC o pasaporte. Devuelve `Id`, `Name`, `INDApellido`, `Phone`, `INDCorreo`, `INDNumeroIdentificacion`, `CountryId`, `RegionId`, `CityId`, `INDPP` e `INDTyC` (los nombres de columna de Creatio; las ubicaciones son GUIDs de sus lookups); `404 CLIENT_NOT_FOUND` si no existe.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `POST` | `/v1/clients`                       | JSON con `Name`, `INDApellido`, `Phone`, `INDCorreo`, `INDNumeroIdentificacion`, `CountryId`, `RegionId`, `CityId` (GUIDs de los lookups `Country`, `Region` y `City`) e `INDPP` e `INDTyC` (deben ser `true`), con los nombres de columna de Creatio y sin `Id`. El servicio agrega `INDOrigenId` = "QR Garantía". Cabecera obligatoria `Idempotency-Key` (UUID v4), que pasa a ser el `Id` de la cuenta en Creatio. `201` si crea; `200` si el reintento ya estaba registrado; `422 CLIENT_ALREADY_EXISTS` si otra cuenta tiene esa identificación.                                                                                                                                                                                                                                                                                                                                                                           |
| `GET`  | `/v1/products/serial/:serialNumber` | Consulta en Creatio (`INDConsultaProductoService/ConsultarPorSerie`, que a su vez consulta a SAP) el producto de ese número de serie (alfanumérico, hasta 18 caracteres). Devuelve `Id`, `Name` y `Code`; `404 SERIAL_NOT_FOUND` si SAP no conoce la serie y `404 PRODUCT_NOT_FOUND` si el material de SAP no existe como producto en Creatio.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `GET`  | `/health/live`, `/health/ready`     | Sondas de liveness y readiness.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

**Idempotencia:** el `Idempotency-Key` se usa como `Id` del registro en Creatio. Un reintento con la misma clave
devuelve la garantía existente en lugar de duplicarla.

**Códigos de error** (`error`): `VALIDATION_ERROR`, `INVALID_INVOICE_FILE`, `INVOICE_UNREADABLE`,
`PURCHASE_DATE_IN_FUTURE`, `IDEMPOTENCY_KEY_INVALID`, `TOO_MANY_REQUESTS`, `OPENAI_UNAVAILABLE`,
`CREATIO_UNAVAILABLE`, `CREATIO_REJECTED_REQUEST`, `CREATIO_AUTH_FAILED`, `INTERNAL_ERROR`.

## Desarrollo local

Prerrequisitos: Node.js 24 LTS (`.nvmrc`) y secretos de un ambiente **no productivo** obtenidos del Vault.

```bash
npm ci
cp .env.example .env      # completar; .env está en .gitignore
npm run start:dev
```

> Si `NODE_ENV=production` está definido en el sistema, usar `npm ci --include=dev`.

| Comando                                 | Acción                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `npm run typecheck`                     | Compila sin emitir (TypeScript `strict`)                                |
| `npm run lint` / `npm run format:check` | ESLint y Prettier                                                       |
| `npm test` / `npm run test:cov`         | Pruebas unitarias / con cobertura y umbrales                            |
| `npm run test:e2e`                      | Pruebas end-to-end de la API (OpenAI y Creatio reemplazados por dobles) |
| `npm run build` · `npm start`           | Compilar y ejecutar `dist/`                                             |

## Configuración

Ver `.env.example`. Se validan al arranque (`src/config/env.validation.ts`); si falta una obligatoria o tiene un
valor inválido, el servicio no inicia y el error nombra la variable, nunca su valor. Los secretos (`AZURE_OPENAI_KEY`,
`CREATIO_CLIENT_SECRET`) se inyectan en tiempo de ejecución desde el Vault, nunca en la imagen. Una variable no
obligatoria que no se define toma el valor por defecto indicado.

### Aplicación

| Variable               | Obligatoria       | Descripción                                                                                                                                                     |
| ---------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`             | No (`development`) | `development`, `test` o `production`. En `development` los logs salen legibles (`pino-pretty`); en el resto, JSON de una línea.                                |
| `PORT`                 | No (`3000`)       | Puerto HTTP donde escucha el servicio.                                                                                                                          |
| `APP_VERSION`          | No (`unknown`)    | Versión desplegada. Se muestra en la especificación OpenAPI de `/docs`. La define el pipeline al construir.                                                    |
| `LOG_LEVEL`            | No (`info`)       | Nivel mínimo de log: `fatal`, `error`, `warn`, `info`, `debug`, `trace` o `silent`. En producción, `info` o superior.                                          |
| `CORS_ALLOWED_ORIGINS` | **Sí**            | URLs desde las que el navegador puede llamar a la API, separadas por coma (p. ej. el front: `http://localhost:5173`). Cada una debe ser una URL válida.        |
| `TRUST_PROXY_HOPS`     | No (`1`)          | Cantidad de proxies confiables (ingress, WAF) delante del servicio. Permite leer la IP real del cliente desde `X-Forwarded-For` para el rate limit. `0` si el servicio se expone directo (local). |
| `OPENAPI_DOCS_ENABLED` | No (`false`)      | `true` publica la documentación interactiva de la API en `/docs`. Mantener en `false` en producción.                                                            |
| `CACHE_ADMIN_ENABLED`  | No (`false`)      | `true` habilita `DELETE /v1/promotions/cache` para vaciar la caché de promociones al probar. Con `false` el endpoint responde 404. Mantener en `false` en producción. |

### Rate limiting (por IP, en memoria de cada instancia)

| Variable                         | Obligatoria | Descripción                                                                                                                                                                         |
| -------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RATE_LIMIT_WINDOW_SECONDS`      | No (`60`)   | Duración de la ventana en segundos. Aplica a los dos límites siguientes.                                                                                                            |
| `RATE_LIMIT_MAX_REQUESTS`        | No (`30`)   | Máximo de peticiones por IP en la ventana, para todos los endpoints. Al superarlo, responde 429.                                                                                    |
| `STRICT_RATE_LIMIT_MAX_REQUESTS` | No (`10`)   | Límite adicional, más bajo, de los endpoints costosos o de escritura (`@StrictRateLimit`): consulta y registro de cliente, lectura de factura, registro de garantía y vaciado de caché. |

### Archivo de factura

| Variable                 | Obligatoria             | Descripción                                                                         |
| ------------------------ | ----------------------- | ----------------------------------------------------------------------------------- |
| `MAX_INVOICE_FILE_BYTES` | No (`10485760` = 10 MB) | Tamaño máximo, en bytes, del archivo de factura que se sube. Si lo supera, se rechaza. |

### Azure OpenAI (lectura de la factura)

| Variable                   | Obligatoria                | Descripción                                                                                                                                         |
| -------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AZURE_OPENAI_ENDPOINT`    | **Sí**                     | URL del recurso de Azure OpenAI (p. ej. `https://<recurso>.openai.azure.com/`).                                                                     |
| `AZURE_OPENAI_KEY`         | **Sí** (secreto)           | API key del recurso. Sale del Vault.                                                                                                                |
| `AZURE_OPENAI_DEPLOYMENT`  | **Sí**                     | Nombre del deployment que lee la factura. Debe tener visión. En Azure es el valor que va en el campo `model`.                                       |
| `AZURE_OPENAI_API_VERSION` | No (`2025-04-01-preview`)  | Versión de la API de Azure OpenAI. Tiene que soportar la Responses API.                                                                             |
| `AZURE_OPENAI_TIMEOUT_MS`  | No (`60000`)               | Tiempo máximo de espera de cada llamada, en milisegundos. Es alto porque leer una imagen puede tardar.                                             |
| `AZURE_OPENAI_MAX_RETRIES` | No (`2`)                   | Reintentos automáticos del SDK ante errores transitorios (timeouts, 429, 5xx). `0` los desactiva.                                                   |

### Creatio (clientes, productos, promociones y registro de la garantía)

| Variable                | Obligatoria       | Descripción                                                                                                                       |
| ----------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `CREATIO_BASE_URL`      | **Sí**            | URL base de la instancia de Creatio. Las rutas OData (`/0/odata`) y REST (`/0/rest`) se agregan encima.                           |
| `CREATIO_TOKEN_URL`     | **Sí**            | Endpoint OAuth 2.0 del servicio de identidad de Creatio, donde se pide el token con *client credentials*.                         |
| `CREATIO_CLIENT_ID`     | **Sí**            | Client ID de la aplicación OAuth registrada en Creatio.                                                                            |
| `CREATIO_CLIENT_SECRET` | **Sí** (secreto)  | Client secret de esa aplicación. Sale del Vault.                                                                                   |
| `CREATIO_TIMEOUT_MS`    | No (`30000`)      | Tiempo máximo de espera de cada llamada a Creatio, en milisegundos.                                                               |

### OpenTelemetry (opcional, fuera del esquema validado)

| Variable                      | Obligatoria | Descripción                                                                                                                                                   |
| ----------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No          | URL del colector OTLP. Si está definida, se activa la instrumentación automática (trazas). Si no, OpenTelemetry no arranca. `OTEL_SDK_DISABLED=true` lo apaga aunque esté definida. |
| `OTEL_SERVICE_NAME`           | No          | Nombre del servicio en las trazas (sugerido: `warranty-registration-bff`). El resto de las variables `OTEL_*` estándar (cabeceras, protocolo) las lee el SDK. |

## Contenedor

```bash
docker build -t warranty-registration-bff .
```

Multi-stage, usuario no root, `HEALTHCHECK` sobre `/health/live`. Sustituir `NODE_IMAGE` por la imagen base corporativa.

## Supuestos y pendientes

- **Registro de la garantía y su factura.** La garantía se registra por OData en `INDProductoEnCliente` (columnas
  confirmadas); el `Id` del registro es la clave de idempotencia. La factura se guarda en `SysFile`
  (`RecordSchemaName` + `RecordId`; `INDProductoEnClienteFile` no existe) y se sube con
  `FileApiService/UploadFile`, porque escribir `SysFile.Data` por OData falla en Creatio. Probado en dev
  (2026-10-06); falta confirmar a ojo que el adjunto aparece en la página. Los nombres viven en
  `src/features/warranties/creatio/creatio-warranty.schema.ts`.
- **Campos del formulario y de la factura** definidos a partir del diagrama; ajustar a los reales.
- **Rate limiting en memoria por instancia.** El estándar (12.8) pide un store compartido (Redis) con varias
  instancias; hoy la protección fuerte es el WAF. Decidir si se incorpora Redis.
- **Acceso anónimo:** los endpoints son públicos por diseño (formulario del cliente); la matriz (sección 8) exige
  aprobación expresa de Arquitectura/Seguridad.
- Pendientes de plataforma: pipeline CI/CD (secciones 9.2 y 21 del estándar), escaneo de secretos, SBOM, Sonar y
  registro de la API en el catálogo corporativo.
- Frameworks: NestJS 11 (la 12 acaba de publicarse); confirmar el baseline vigente con Arquitectura.
