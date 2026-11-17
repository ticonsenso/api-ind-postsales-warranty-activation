# Pendientes del proyecto

Lista de cosas por verificar, decidir o completar. Se elimina cada punto al resolverlo.

## 1. Por verificar (código escrito, sin comprobar)

- [ ] Instalar dependencias: `npm install --include=dev` con Node 24 (el sistema tiene `NODE_ENV=production` y Node 16 por defecto).
- [ ] `npm run format` — Prettier no se ejecutó sobre los specs e2e ni sobre `test/support/`.
- [ ] `npm run typecheck` y `npm run lint` — pasaron antes de escribir los e2e; volver a correrlos.
- [ ] `npm test` — pasaron 64 pruebas unitarias antes de escribir los e2e.
- [ ] `npm run test:cov` — confirmar que se cumplen los umbrales de `jest.config.ts`.
- [ ] `npm run test:e2e` — nunca se ejecutaron (`test/warranties.e2e-spec.ts`, `test/rate-limit.e2e-spec.ts`).
- [ ] `docker build` — el Dockerfile no se probó.
- [ ] Arrancar con `npm run start:dev` y llamar a los endpoints con credenciales reales de un ambiente no productivo.
- [ ] Documentación del código: el estándar (sección 6) pide que la primera línea de cada bloque tenga máximo 80 caracteres. No se revisó; puede haber bloques que se pasen.
- [ ] `npm audit` — quedó en 0 vulnerabilidades gracias al `overrides` de `multer`; revisar si sigue haciendo falta cuando salga una versión nueva de `@nestjs/platform-express`.

## 2. Necesito información para completar

- [x] **Esquema real de Creatio:** la garantía se registra en `INDProductoEnCliente` (cliente, producto, serie, fecha, comprobante, emisor y tipo de cobertura "Garantía").
- [x] **Entidad de adjuntos:** `INDProductoEnClienteFile` no existe; la página usa `SysFile` (`RecordSchemaName` + `RecordId`, `FileGroupId` "Archivos adjuntos").
- [x] **Carga en `SysFile`** probada en dev (2026-10-06): el `PUT .../Data` por OData falla con 500 (`Object reference not set to an instance of an object`), así que el archivo se sube con `FileApiService/UploadFile` (bytes en el cuerpo, datos en la query, `RecordSchemaName` en `additionalParams`). El servicio completa `TypeId`, `Size` y el grupo "Archivos adjuntos". Verificado con un archivo de 5 MB en un solo bloque.
- [ ] **Mostrar la factura en Creatio (administrador):** la factura se vincula al producto de cliente, no a la cuenta, así que no aparece en el panel "Archivos adjuntos" de la cuenta. Hay que agregar el componente de adjuntos a la página de `INDProductoEnCliente` y verificar que se pueda abrir esa página desde la lista "Producto en cliente" de la cuenta. Decidido el 2026-10-06: la factura queda en el producto, no en la cuenta.
- [ ] Confirmar en `$metadata` los nombres OData de las columnas lookup: `Account.CountryId`/`RegionId`/`CityId`/`INDOrigenId` e `INDProductoEnCliente.INDClienteId`/`INDProductId`/`INDGarantiaId`.
- [ ] Columnas de `INDProductoEnCliente` que no se envían (`INDAplicaGarantia`, `INDProteccionExtendida`, `INDFechaInicioPexi`, `INDFechaFinPexi`, `INDNotificacionVencimientoG…`): confirmar que las completa Creatio.
- [x] `INDProductoEnCliente.Id` acepta un GUID enviado por el cliente (se usa como clave de idempotencia); probado en dev.
- [ ] Endpoint OAuth de Creatio (`CREATIO_TOKEN_URL`) y tipo de archivo del adjunto (algunas entidades de archivo exigen `TypeId`).
- [ ] **Campos reales del formulario** (hoy: nombre, apellido, identificación, correo, teléfono, modelo, serie, factura, fecha de compra, tienda).
- [ ] **Campos que debe extraer la factura** (el diagrama tiene el texto cortado en "Extracción estructurada (JSON):").
- [ ] Elegir el deployment de Azure OpenAI definitivo (`AZURE_OPENAI_DEPLOYMENT`): hoy `gpt-56-terra-activation`; comparar con `luna` y `nano` leyendo facturas reales (precisión y costo).
- [ ] Cuota del deployment: una prueba de `terra` ya devolvió **429** (límite de tasa). Pedir más cuota o confirmar que alcanza para el tráfico esperado.
- [ ] Probar la lectura real con una factura (imagen y PDF): la extracción estructurada contra Azure aún no se ha ejecutado desde el código.
- [ ] Nivel de **criticidad** de la aplicación, validado por Arquitectura Empresarial. Hoy se asume media.
- [ ] Propietario funcional y equipo responsable (para el README).
- [ ] Plataforma de CI/CD y repositorio corporativo.

## 3. Decisiones por tomar

- [ ] **Flujo de dos pasos:** hoy hay un endpoint para leer la factura (pre-llenar el formulario) y otro para registrar. Confirmar si el frontend espera esto o un solo paso.
- [ ] **Rate limiting:** hoy es en memoria por instancia. El estándar (12.8) exige un store compartido (Redis) con varias instancias. Decidir entre incorporar Redis o dejar la protección al WAF y registrarlo como excepción.
- [ ] **Caché de productos (`TtlCache`, 1h):** mismo trade-off que el rate limiting — vive en memoria de cada instancia, así que con varias instancias detrás de un balanceador no se invalida entre sí (una serie actualizada en Creatio puede tardar hasta 1h en reflejarse en alguna instancia). Pasar a un store compartido (Redis) si eso deja de ser aceptable.
- [ ] **Caché de promociones (`TtlCache`, 2h):** misma limitación por instancia que la caché de productos; un cambio en `INDPromociones` puede tardar hasta 2h en reflejarse (`DELETE /v1/promotions/cache` solo vacía la instancia que atiende).
- [ ] **Reincorporar la caché de promociones (2h) y el fallback a la última copia válida:** hoy la caché está desactivada (`HOURS_IN_CACHE = 0` en `promotions.constants.ts`: cada pedido consulta a Creatio y `X-Cache` responde siempre `MISS`) y el fallback fue retirado. Para volver al comportamiento anterior, tal cual estaba (el código sigue en el historial de git, antes del commit que lo retira; verlo con `git log -- src/features/promotions/promotions.service.ts` y `git show <commit>^:src/features/promotions/promotions.service.ts`):
  - **Caché:** `HOURS_IN_CACHE = 2` en `promotions.constants.ts` (TTL de 2h; barrido de entradas vencidas cada 15 min con `PROMOTION_CACHE_SWEEP_INTERVAL_MS`). Borrar `test/promotions-cache-default.e2e-spec.ts`, que verifica que no se cachea. Los demás tests ya prueban la caché con un TTL propio de 2h.
  - **Fallback (`X-Cache: STALE`):** si Creatio falla al refrescar la tabla y hubo antes una consulta exitosa, se sirve la última copia válida en vez de fallar; si nunca hubo una, el error se propaga. Esa copia se guarda en la caché con un TTL propio de 15 min (`PROMOTION_STALE_RETRY_MS = 15 * MILLISECONDS_PER_MINUTE`, constante `STALE_RETRY_MINUTES = 15`) y al vencer se vuelve a consultar a Creatio, sin esperar el ciclo completo de 2h; si ese reintento también falla, se sirve otra vez la última copia por otros 15 min. Se registra un `warn` con `event: 'promotions.stale_fallback'`, `retryInMs` y `error`.
  - **Piezas a restaurar:** en `promotions.service.ts`, el campo privado `lastValid: CreatioPromotion[] | null` (última tabla obtenida con éxito, sobrevive al vencimiento de la entrada), el `Logger`, la entrada de caché `CachedPromotions { promotions, stale }` (hoy la caché guarda solo `CreatioPromotion[]`) y el `try/catch` de `refreshPromotions` que guarda `lastValid` al éxito y sirve la copia con `stale: true` al fallar. En `common/constants/http.constants.ts`, el valor `stale: 'STALE'` de `CACHE_STATUS` y su descripción de la cabecera `X-Cache`. En el controller, la descripción de Swagger del `STALE` (reintento a los 15 minutos).
  - **Tests a restaurar** (`promotions.service.spec.ts`, bloque «when Creatio fails after a successful query»): sirve la última copia y responde `STALE` en lugar de fallar; no consulta a Creatio durante los siguientes 15 min; consulta de nuevo a los 15 min y cachea la tabla nueva por el TTL completo (`MISS` y luego `HIT`); si el reintento también falla, sigue sirviendo la última copia otros 15 min. El test «fails instead of serving an older copy…» deja de aplicar y se borra.
  - **Limitación conocida:** la última copia vive solo en memoria de cada instancia: tras un reinicio, si Creatio está caído, el endpoint responde error hasta que vuelva.
- [ ] **Acceso anónimo:** los endpoints son públicos. La matriz (sección 8) exige aprobación expresa de Arquitectura o Seguridad.
- [ ] **Códigos HTTP para fallas de OpenAI y Creatio:** hoy devuelven 500 porque la tabla del estándar (15.3) no incluye 502 ni 503. Consultar si se puede añadir uno.
- [ ] **Duplicado por negocio:** hoy solo se evita duplicar por `Idempotency-Key`. Definir si además debe rechazarse la misma factura + número de serie ya registrados.
- [ ] **Reglas sobre la fecha de compra:** hoy solo se rechaza una fecha futura. Definir si hay una antigüedad máxima o un plazo de garantía.
- [ ] **Versión de NestJS:** se usa la 11 (la 12 acaba de publicarse). Confirmar con Arquitectura el baseline vigente.
- [ ] **Registros huérfanos en Creatio:** si el borrado compensatorio falla, queda una garantía sin factura o la cuenta de un cliente nuevo sin garantía, y solo se registra en logs (`creatio.rollback_incomplete`). Un reintento con la misma clave reutiliza esa cuenta. Definir si hace falta un proceso de limpieza.

## 4. Pendientes de plataforma (fuera del código)

- [ ] `git init` y convención de ramas y commits (matriz 9.8).
- [ ] Pipeline de CI/CD completo (matriz 9.2 y estándar sección 21): build, pruebas con cobertura, Sonar, dependencias, `gitleaks`, imagen, escaneo, SBOM, despliegue y rollback.
- [ ] Hooks de pre-commit con Husky (lint y escaneo de secretos), recomendado.
- [ ] Dependabot o Renovate (uno solo).
- [ ] Secretos en el Vault corporativo, inyectados en tiempo de ejecución.
- [ ] Imagen base corporativa en el `Dockerfile` (hoy `node:24-alpine`).
- [ ] Registro de la API en el catálogo corporativo de APIs y pruebas de contrato.
- [ ] Diagramas ArchiMate/C4 obligatorios (matriz 4.1) y guía de despliegue.
- [ ] Ajustar el WAF y el `TRUST_PROXY_HOPS` al número real de proxies delante del servicio. Por debajo, todos los usuarios comparten el contador del rate limit; por encima, se puede evadir con un `X-Forwarded-For` falso. El valor por defecto es 1 y el `.env` local usa 0. Confirmar con quien despliega y probarlo con un `X-Forwarded-For` inventado.
- [ ] Quitar `NODE_TLS_REJECT_UNAUTHORIZED=0` del entorno de desarrollo.
