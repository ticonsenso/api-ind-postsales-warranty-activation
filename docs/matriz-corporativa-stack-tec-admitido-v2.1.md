# Matriz tecnológica por criticidad de aplicaciones satélite

**Versión vigente:** 2.3  · **Última actualización:** 2026/08/07 · **Próxima revisión programada:** revisión periódica alineada a la política semestral de baseline tecnológico (sección 10)

## Historial de versiones

| Versión | Fecha      | Autor      | Cambios                                                      |
| ------- | ---------- | ---------- | ------------------------------------------------------------ |
| 2.0     | 2026/08/05 | PAUCAY     | Upgrade de versión                                           |
| 2.1     | 2026/08/07 | CFERNANDEZ | Estándar de documentación de código fuente (4.5); control de versiones y ramas — Git (9.8) |
| 2.2     | 2026/08/07 | CFERNANDEZ | Corregida contradicción de OpenTelemetry entre la tabla de criticidad y la sección 9.5; unificado API-first para toda criticidad (sección 2). |
| 2.3     | 2026/08/07 | CFERNANDEZ | Quitado Quarkus de la tabla de backend preferente (sección 2): no tenía desarrollo en la sección 5.1 ni respaldo de uso real; queda Java LTS + Spring Boot como único framework Java documentado. |

---

## 1. Clasificación de criticidad

Las aplicaciones satélite deberán clasificarse en uno de los siguientes niveles antes de definir su arquitectura y stack tecnológico.




| Criterio              | Criticidad alta                                                                                                       | Criticidad media                                                                                           | Criticidad baja                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Impacto en el negocio | Interrupción directa de ventas, abastecimiento, inventario, finanzas, operación de tiendas o cumplimiento regulatorio | Afectación relevante a procesos internos, productividad o servicio, con mecanismos alternativos temporales | Impacto limitado a un área o proceso no esencial  |
| Disponibilidad        | Alta disponibilidad requerida                                                                                         | Disponibilidad en horario extendido o laboral                                                              | Disponibilidad en horario laboral                 |
| Pérdida de datos      | No aceptable o muy limitada                                                                                           | Pérdida limitada y recuperable                                                                             | Pérdida tolerable dentro del respaldo disponible  |
| Integraciones         | Múltiples sistemas críticos o corporativos                                                                            | Sistemas internos y servicios corporativos                                                                 | Integraciones simples o aisladas                  |
| Usuarios              | Alto volumen o cobertura corporativa                                                                                  | Varias áreas o grupos relevantes                                                                           | Área específica o pocos usuarios                  |
| Sensibilidad de datos | Alta, regulada o confidencial                                                                                         | Interna o confidencial moderada                                                                            | Baja sensibilidad                                 |
| Recuperación          | RTO y RPO estrictos                                                                                                   | RTO y RPO intermedios                                                                                      | Recuperación mediante restauración o redespliegue |


La clasificación deberá ser validada por Arquitectura Empresarial, Seguridad de la Información y el responsable del proceso de negocio.

---



# 2. Matriz de arquitectura y tecnología


| Dominio                       | Criticidad alta                                                                               | Criticidad media                                                                     | Criticidad baja                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Arquitectura base             | Monolito modular o microservicios justificados                                                | Monolito modular o microservicios justificados                                       | Monolito modular o microservicios justificados                                       |
| Características obligatorias  | Modularidad, bajo acoplamiento, alta cohesión, tolerancia a fallos y escalabilidad horizontal | Modularidad, bajo acoplamiento, alta cohesión y capacidad de escalamiento            | Modularidad, separación de responsabilidades y facilidad de mantenimiento            |
| Backend preferente            | Java LTS + Spring Boot                                                                        | Java LTS + Spring Boot o Node.js LTS + TypeScript + NestJS                           | Node.js LTS + TypeScript + NestJS o Java LTS + Spring Boot                           |
| Uso de Node.js                | BFF, APIs livianas, orquestación e integraciones no intensivas en CPU                         | APIs, BFF, integraciones y servicios livianos                                        | Backend general para aplicaciones pequeñas o medianas                                |
| Frontend preferente           | Angular + TypeScript                                                                          | Angular + TypeScript                                                                 | Angular + TypeScript                                                                 |
| Frontend alternativo          | React + TypeScript, previa aprobación                                                         | React + TypeScript para productos digitales                                          | React + TypeScript                                                                   |
| PHP                           | No permitido                                                                                  | Solo mantenimiento de aplicaciones existentes, previa excepción                      | Solo mantenimiento o soluciones justificadas, previa excepción                       |
| API                           | API-first y OpenAPI 3.x obligatorios                                                          | API-first y OpenAPI 3.x obligatorios                                                 | API-first y OpenAPI 3.x obligatorios cuando exista API                               |
| Autenticación                 | OAuth 2.0 y OpenID Connect                                                                    | OAuth 2.0 y OpenID Connect                                                           | Integración con IAM corporativo; OAuth 2.0/OIDC cuando aplique                       |
| Contenedores                  | Obligatorios                                                                                  | Obligatorios                                                                         | Obligatorios                                                                         |
| Orquestación                  | Kubernetes                                                                                    | Plataforma corporativa de contenedores                                               | Plataforma corporativa de contenedores o servicio administrado                       |
| CI/CD                         | Obligatorio y completamente automatizado                                                      | Obligatorio                                                                          | Obligatorio                                                                          |
| Infraestructura como código   | Obligatoria                                                                                   | Obligatoria                                                                          | Obligatoria cuando se aprovisione infraestructura propia                             |
| Observabilidad                | Logs, métricas, trazas, alertas y auditoría                                                   | Logs, métricas, trazas y alertas                                                     | Logs centralizados y métricas básicas                                                |
| Estándar de observabilidad    | OpenTelemetry obligatorio                                                                     | OpenTelemetry obligatorio                                                            | OpenTelemetry cuando exista soporte en la plataforma                                 |
| Estrategia de despliegue      | Blue/green o canary                                                                           | Rolling, blue/green según riesgo                                                     | Rolling deployment                                                                   |
| Alta disponibilidad           | Múltiples instancias y eliminación de puntos únicos de falla                                  | Múltiples instancias cuando el RTO lo requiera                                       | Una instancia con capacidad de recuperación                                          |
| Escalabilidad                 | Horizontal y automatizada                                                                     | Horizontal o vertical según carga                                                    | Vertical o manual                                                                    |
| Recuperación                  | Plan de recuperación probado                                                                  | Procedimiento de recuperación documentado                                            | Restauración de respaldo o redespliegue                                              |
| Seguridad                     | Threat modeling, SAST, DAST, SCA, SBOM y pruebas de seguridad                                 | SAST, SCA, SBOM y pruebas de seguridad                                               | SAST, SCA y escaneo de dependencias                                                  |
| Pruebas unitarias             | Obligatorias; bloquean el pipeline de CI/CD                                                   | Obligatorias; bloquean el pipeline de CI/CD                                          | Obligatorias; bloquean el pipeline de CI/CD                                          |
| Cobertura de código           | Negocio backend ≥ 80 %; backend global ≥ 70 %; ramas negocio ≥ 70 %; frontend ≥ 60 %          | Negocio backend ≥ 70 %; backend global ≥ 60 %; ramas negocio ≥ 60 %; frontend ≥ 50 % | Negocio backend ≥ 60 %; backend global ≥ 50 %; ramas negocio ≥ 50 %; frontend ≥ 40 % |
| Documentación del repositorio | README, runbook operativo, guía de despliegue y ADRs para decisiones relevantes               | README, guía de despliegue y runbook básico                                          | README con instrucciones de build, ejecución y pruebas                               |
| Gestión de secretos           | Vault; rotación periódica; auditoría de accesos; bloqueo en CI/CD                             | Vault; rotación documentada                                                          | Vault; sin secretos en repositorio                                                   |
| Soporte operativo             | 24x7 según necesidad del negocio                                                              | 8x5 o 12x5                                                                           | Horario laboral                                                                      |




---



# 3. Lineamientos de arquitectura



## 3.1 Arquitectura modular

La solución deberá implementar una arquitectura modular, de bajo acoplamiento y alta cohesión.

Cada módulo deberá:

- Representar una capacidad funcional o dominio claramente delimitado.
- Tener responsabilidades específicas.
- Evitar dependencias circulares.
- Exponer contratos explícitos.
- Mantener separadas las reglas de negocio, la lógica de aplicación y la infraestructura.
- Permitir pruebas independientes.
- Evitar el acceso directo a componentes internos de otros módulos.
- Minimizar el impacto de los cambios entre módulos.

La organización interna podrá adoptar arquitectura hexagonal, clean architecture, arquitectura en capas o un patrón equivalente, siempre que cumpla los principios anteriores.

## 3.2 Monolito modular

El monolito modular será el patrón de arquitectura predeterminado para aplicaciones satélite.

Deberá utilizarse cuando:

- La solución sea desarrollada y mantenida por uno o pocos equipos.
- Los componentes compartan ciclos de despliegue.
- No exista una necesidad comprobada de escalamiento independiente.
- El dominio y sus límites aún se encuentren en evolución.
- La complejidad operativa de microservicios no se justifique.

Un monolito modular no deberá confundirse con una aplicación monolítica sin estructura. Los límites entre módulos deberán ser explícitos y verificables.

## 3.3 Microservicios

Los microservicios solo podrán utilizarse con aprobación de Arquitectura Empresarial.

La propuesta deberá demostrar:

- Límites de dominio claramente definidos.
- Necesidad de despliegue independiente.
- Necesidad de escalamiento independiente.
- Equipos responsables autónomos.
- Requerimientos diferenciados de disponibilidad o desempeño.
- Capacidad operativa para administrar múltiples servicios.
- Observabilidad distribuida.
- Gestión de fallos parciales.
- Estrategia de consistencia de datos.
- Automatización de despliegues.
- Beneficio superior a la complejidad introducida.

No se considerarán justificaciones válidas:

- La preferencia del proveedor.
- La tendencia del mercado.
- El solo hecho de contenerizar la aplicación o usar Kubernetes u orquestadores similares, sin cumplir los demás criterios de esta sección.
- La expectativa de crecimiento sin evidencia.
- La división técnica por capas, por ejemplo un microservicio para frontend, otro para lógica y otro para base de datos.

---



# 4. Diagramas y documentación de arquitectura

Los proveedores deberán entregar diagramas alineados con ArchiMate y, cuando se requiera mayor detalle técnico, vistas complementarias basadas en C4.

## 4.1 Diagramas obligatorios para todas las aplicaciones


| Diagrama                       | Contenido mínimo                                                         |
| ------------------------------ | ------------------------------------------------------------------------ |
| Contexto de la solución        | Usuarios, áreas, sistemas externos, alcance y límites                    |
| Cooperación de aplicaciones    | Aplicaciones participantes, servicios consumidos y ofrecidos             |
| Integraciones                  | APIs, eventos, archivos, mensajería, protocolos y direcciones de flujo   |
| Despliegue                     | Nodos, contenedores, ambientes, zonas de red y dependencias              |
| Seguridad                      | IAM, autenticación, autorización, secretos, cifrado y zonas de confianza |
| Modelo de datos conceptual     | Entidades principales, relaciones y propietarios de la información       |
| Vista de módulos o componentes | Módulos internos, responsabilidades, dependencias e interfaces           |




## 4.2 Diagramas adicionales para criticidad alta

- Vista de alta disponibilidad.
- Vista de continuidad y recuperación.
- Vista de observabilidad.
- Vista de flujos de información sensibles.
- Vista de dependencias críticas.
- Vista de arquitectura de integración.
- Vista de implementación y migración.
- Diagrama de secuencia para procesos críticos.
- Modelo de amenazas.
- Diagrama de topología de red.
- Matriz de trazabilidad entre requisitos y componentes.



## 4.3 Estándares de modelado

- ArchiMate será el lenguaje principal para arquitectura empresarial.
- C4 podrá utilizarse para detallar contexto, contenedores, componentes y código.
- BPMN podrá utilizarse para procesos de negocio.
- UML podrá utilizarse para secuencias, estados y clases cuando aporte claridad.
- Los diagramas deberán mantenerse versionados en el repositorio corporativo.
- No se aceptarán diagramas que no correspondan con la solución implementada.



## 4.4 Documentación del repositorio

Toda aplicación satélite deberá entregarse con documentación técnica versionada en el repositorio de código, actualizada en cada release y coherente con la solución implementada. La documentación de arquitectura (secciones 4.1 a 4.3) complementa, pero no sustituye, la documentación operativa y de desarrollo del repositorio.

### README obligatorio

Cada repositorio deberá incluir un archivo `README.md` en la raíz del proyecto con, como mínimo:

- Nombre y descripción de la aplicación.
- Nivel de criticidad y propietario funcional.
- Contacto del equipo responsable o proveedor.
- Stack tecnológico y versión de runtime.
- Prerrequisitos para desarrollo local.
- Instrucciones para clonar, compilar, ejecutar y probar la aplicación.
- Variables de entorno o configuración requerida (sin incluir secretos).
- Enlaces a documentación complementaria: OpenAPI, diagramas de arquitectura, runbook y catálogo de APIs, cuando aplique.



### Documentación adicional por criticidad


| Entregable                                   | Criticidad alta                                            | Criticidad media                           | Criticidad baja    |
| -------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------ | ------------------ |
| `README.md`                                  | Obligatorio                                                | Obligatorio                                | Obligatorio        |
| Guía de despliegue                           | Obligatoria                                                | Obligatoria                                | Resumida en README |
| Runbook operativo                            | Obligatorio (incidentes, rollback, escalamiento)           | Básico (arranque, parada, logs, contactos) | No obligatorio     |
| Registro de decisiones de arquitectura (ADR) | Obligatorio para decisiones relevantes                     | Recomendado                                | No obligatorio     |
| Guía de contribución o desarrollo            | Obligatoria cuando participen varios equipos o proveedores | Recomendada                                | No obligatorio     |
| Changelog o release notes                    | Obligatorio por versión                                    | Obligatorio por versión                    | Recomendado        |




### Reglas de mantenimiento

- La documentación deberá revisarse en cada cambio relevante de arquitectura, despliegue, integraciones o configuración.
- No se aceptarán repositorios cuya documentación esté desactualizada respecto al código en producción.
- Los secretos, credenciales y datos sensibles no deberán incluirse en README ni en documentación versionada; se referenciarán mediante el mecanismo corporativo de gestión de secretos (sección 9.7).
- La entrega de una versión a producción no procederá si falta el `README.md` o la documentación mínima exigida para el nivel de criticidad.

## 4.5 Documentación del código fuente

Todo código deberá documentarse utilizando el estándar de documentación propio del lenguaje empleado (por ejemplo, Javadoc para Java, TSDoc/JSDoc para TypeScript/JavaScript, o el equivalente vigente para otros lenguajes del catálogo tecnológico).

### Alcance obligatorio

- Toda clase, método y atributo o variable relevante deberá documentarse.
- Podrá omitirse la documentación únicamente en código simple cuyo nombre y propósito se entiendan sin ambigüedad.
- Será obligatoria, sin excepción, en métodos extensos, clases y archivos de mayor tamaño, incluso cuando su nombre parezca autoexplicativo.

### Contenido y formato

- La primera frase deberá responder, de forma inmediata y en una sola oración, qué es, para qué sirve y por qué existe.
- El bloque completo de documentación no deberá superar las 200 palabras.
- Cuando el estándar de documentación del lenguaje contemple etiquetas de fecha (por ejemplo `@since`) o de autoría (por ejemplo `@author`), su uso será obligatorio.

---



# 5. Backend



## 5.1 Java LTS y Spring Boot

Java LTS con Spring Boot será la tecnología preferente para:

- Backend empresarial.
- Aplicaciones de criticidad alta.
- Procesos transaccionales.
- Integraciones complejas.
- Servicios de larga vida útil.
- Dominios con reglas de negocio complejas.
- Procesamiento asíncrono y mensajería.
- Servicios que requieran alta disponibilidad.

Requisitos mínimos:

- Versión Java LTS vigente y soportada.
- Versión de Spring Boot soportada.
- Gestión de dependencias mediante Maven o Gradle.
- Pruebas unitarias y de integración conforme a la sección 9.6.
- Migraciones de base de datos versionadas.
- APIs documentadas mediante OpenAPI.
- Instrumentación con OpenTelemetry.
- Análisis de calidad y seguridad automatizado.
- Configuración externalizada conforme a la sección 9.7.
- Ejecución mediante contenedor OCI.



## 5.2 Node.js, TypeScript y NestJS

Node.js LTS con TypeScript y NestJS podrá utilizarse para:

- Backend for Frontend.
- APIs livianas.
- Servicios de integración.
- Orquestación.
- Notificaciones.
- Servicios en tiempo real.
- Aplicaciones de criticidad media o baja.
- Servicios con predominio de operaciones de entrada y salida.

No será la opción preferente para:

- Procesamiento intensivo de CPU.
- Procesos batch complejos.
- Cálculos extensivos.
- Transacciones distribuidas.
- Dominios críticos sin experiencia operativa previa.
- Aplicaciones con alta dependencia de procesos síncronos de larga duración.

Requisitos mínimos:

- Node.js en versión LTS vigente.
- TypeScript obligatorio.
- NestJS como framework estándar.
- Prohibido utilizar JavaScript sin tipado para backend corporativo.
- Pruebas automatizadas conforme a la sección 9.6.
- Validación de entradas.
- OpenAPI.
- OpenTelemetry.
- Gestión segura de dependencias.
- Contenedor OCI.
- Manejo centralizado de errores.
- Configuración externalizada conforme a la sección 9.7.

---



# 6. Frontend



## 6.1 Angular y TypeScript

Angular con TypeScript será el estándar corporativo por defecto.

Se utilizará preferentemente para:

- Aplicaciones administrativas.
- Aplicaciones internas.
- Portales empresariales.
- Flujos complejos.
- Aplicaciones con múltiples módulos.
- Aplicaciones desarrolladas por distintos proveedores.
- Soluciones con vida útil prolongada.

Requisitos mínimos:

- Versión Angular soportada.
- TypeScript obligatorio.
- Diseño basado en componentes.
- Uso del Design System corporativo.
- Accesibilidad conforme al estándar corporativo.
- Diseño responsive.
- Pruebas unitarias conforme a la sección 9.6 y end-to-end para flujos críticos.
- Gestión centralizada de errores.
- Integración con IAM corporativo.
- Prohibido almacenar secretos o credenciales en el navegador (sección 9.7).
- Prohibido acceder directamente a bases de datos.



## 6.2 React y TypeScript

React con TypeScript será una alternativa aprobada para productos digitales.

Se podrá utilizar en:

- Experiencias digitales orientadas a clientes.
- Comercio electrónico.
- Aplicaciones con alta personalización de experiencia.
- Productos con evolución frecuente.
- Soluciones que requieran renderizado del lado del servidor.
- Aplicaciones cuya plataforma tecnológica ya utilice React.

La propuesta deberá definir:

- Framework de construcción o renderizado.
- Enrutamiento.
- Gestión de estado.
- Librería de componentes.
- Estrategia de pruebas.
- Manejo de errores.
- Observabilidad frontend.
- Estructura del proyecto.
- Estrategia de actualización.

React requerirá aprobación de Arquitectura Empresarial cuando no corresponda a una categoría previamente autorizada.

---



# 7. Tecnologías no aplicables para nuevos desarrollos

PHP no formará parte del stack estándar para nuevos desarrollos.

Solo podrá utilizarse en:

- Mantenimiento de aplicaciones existentes.
- Productos empaquetados que lo requieran.
- Soluciones con justificación técnica y económica aprobada.
- Procesos de transición hacia una tecnología estratégica.

En todos los casos deberá cumplir:

- Versión soportada.
- Framework soportado.
- Gestión de dependencias.
- Pruebas automatizadas.
- Contenedor OCI.
- Análisis de vulnerabilidades.
- Plan de actualización.
- Plan de modernización o salida.

Quedan prohibidos:

- PHP 5.
- AngularJS.
- .NET Framework para nuevos desarrollos.
- Java fuera de soporte.
- Node.js fuera de soporte.
- Frameworks o librerías abandonadas.
- Componentes sin parches de seguridad.
- Lenguajes o frameworks no incluidos en el catálogo tecnológico sin excepción aprobada.

---



# 8. APIs

Las APIs deberán diseñarse bajo un enfoque API-first y documentarse mediante OpenAPI 3.x.

## Requisitos obligatorios

- Contrato definido antes o durante las primeras etapas del desarrollo.
- Versionamiento explícito.
- Esquemas de solicitud y respuesta.
- Manejo estandarizado de errores.
- Validación de entradas.
- Paginación para colecciones.
- Filtrado y ordenamiento normalizados.
- Identificador de correlación.
- Timeouts.
- Rate limiting.
- Autenticación y autorización.
- Idempotencia cuando corresponda.
- Trazabilidad.
- Registro en el catálogo corporativo de APIs.
- Pruebas automatizadas de contrato.
- Compatibilidad hacia atrás durante el periodo definido.

Las APIs no deberán:

- Exponer estructuras internas de base de datos.
- Incluir credenciales o datos sensibles en URLs.
- Depender de sesiones locales del servidor.
- Permitir acceso anónimo salvo aprobación expresa.
- Cambiar contratos sin versionamiento.
- Utilizar códigos HTTP de forma inconsistente.

---



# 9. Despliegue y capacidades transversales



## 9.1 Contenedores OCI

Toda solución nueva deberá entregarse mediante imágenes de contenedor compatibles con OCI.

Las imágenes deberán:

- Construirse mediante CI/CD.
- Utilizar imágenes base aprobadas.
- Ejecutarse como usuario no root.
- No contener secretos (sección 9.7).
- Ser inmutables.
- Incluir health checks.
- Ser escaneadas por vulnerabilidades.
- Generar un SBOM.
- Mantener dependencias mínimas.
- Identificarse mediante una versión única.
- Publicarse en el registro corporativo.



## 9.2 CI/CD

Toda solución deberá contar con pipelines automatizados para:

- Compilación.
- Pruebas unitarias con validación de cobertura mínima (sección 9.6).
- Pruebas de integración.
- Análisis estático.
- Análisis de dependencias.
- Detección de secretos; el pipeline deberá bloquearse ante hallazgos no remediados (sección 9.7).
- Construcción de imágenes.
- Escaneo de imágenes.
- Generación de SBOM.
- Despliegue.
- Pruebas posteriores al despliegue.
- Rollback.

No se permitirán despliegues manuales en producción.

## 9.3 Infraestructura como código

La infraestructura deberá definirse mediante código cuando la solución requiera:

- Recursos cloud.
- Redes.
- Balanceadores.
- Bases de datos administradas.
- Colas.
- almacenamiento.
- Clústeres.
- Configuraciones de plataforma.
- Políticas de acceso.

El código de infraestructura deberá:

- Mantenerse en el repositorio corporativo.
- Versionarse.
- Revisarse mediante pull request.
- Ejecutarse mediante pipeline.
- Ser reproducible.
- Evitar configuraciones manuales no documentadas.
- No incluir secretos en código, variables de pipeline ni archivos de estado; utilizar referencias al vault (sección 9.7).



## 9.4 OAuth 2.0 y OpenID Connect

Toda aplicación deberá integrarse con el servicio corporativo de identidad.

- OpenID Connect se utilizará para autenticación.
- OAuth 2.0 se utilizará para autorización de APIs.
- La autorización deberá implementarse mediante roles, scopes o atributos.
- No se permitirán mecanismos de autenticación propietarios sin aprobación.
- No se almacenarán contraseñas corporativas en las aplicaciones.
- Las cuentas técnicas deberán administrarse centralmente.
- Los client secrets de OAuth y tokens de servicio deberán almacenarse en el gestor corporativo de secretos (sección 9.7).



## 9.5 OpenTelemetry

La instrumentación de observabilidad utilizará OpenTelemetry conforme al nivel de criticidad y disponibilidad de soporte definidos en la matriz de arquitectura y tecnología (sección 2): obligatorio para criticidad alta y media; para criticidad baja, cuando exista soporte en la plataforma.

La aplicación deberá emitir:

- Logs estructurados.
- Métricas.
- Trazas distribuidas.
- Identificadores de correlación.
- Información de versión.
- Indicadores de salud.
- Eventos de auditoría cuando corresponda.



## 9.6 Pruebas unitarias y cobertura de código

Toda solución deberá incluir pruebas unitarias automatizadas ejecutadas en el pipeline de CI/CD. No se permitirá el despliegue a ambientes de prueba, preproducción o producción si las pruebas unitarias fallan o si la cobertura medida está por debajo del umbral definido para el nivel de criticidad de la aplicación.

### Umbrales mínimos por criticidad

Los porcentajes corresponden a cobertura de **líneas**, salvo donde se indique cobertura de **ramas**.


| Métrica                                           | Criticidad alta                                      | Criticidad media                                | Criticidad baja                    |
| ------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------- | ---------------------------------- |
| Pruebas unitarias                                 | Obligatorias; bloquean el pipeline                   | Obligatorias; bloquean el pipeline              | Obligatorias; bloquean el pipeline |
| Cobertura de líneas — lógica de negocio (backend) | ≥ 80 %                                               | ≥ 70 %                                          | ≥ 60 %                             |
| Cobertura de líneas — backend (global)            | ≥ 70 %                                               | ≥ 60 %                                          | ≥ 50 %                             |
| Cobertura de ramas — lógica de negocio (backend)  | ≥ 70 %                                               | ≥ 60 %                                          | ≥ 50 %                             |
| Cobertura de líneas — frontend                    | ≥ 60 %                                               | ≥ 50 %                                          | ≥ 40 %                             |
| Pruebas de integración                            | Obligatorias para APIs, persistencia e integraciones | Obligatorias para APIs e integraciones críticas | Recomendadas cuando exista API     |
| Pruebas end-to-end (frontend)                     | Flujos críticos automatizados                        | Flujos principales automatizados                | Según riesgo del negocio           |




### Alcance de la medición

- La cobertura de **lógica de negocio** incluirá dominio, casos de uso, servicios de aplicación, reglas de negocio y validadores.
- Quedarán **excluidos** de la medición obligatoria: clases de configuración, arranque (`main`), DTOs o mapeos sin lógica, código generado, adaptadores de infraestructura sin reglas de negocio, plantillas y archivos de estilo.
- La medición se realizará con herramientas estándar del stack — por ejemplo JaCoCo para Java, Istanbul o nyc para Node.js/TypeScript, y Karma o Jest para Angular — e integrará reportes en el pipeline de CI/CD.



### Reglas de calidad

- Todo código nuevo o modificado en módulos de lógica de negocio deberá acompañarse de pruebas unitarias.
- En criticidad **alta**, el código nuevo en lógica de negocio deberá mantener una cobertura de líneas **≥ 80 %** en el diff del pull request (cobertura diferencial).
- En criticidad **media**, la cobertura diferencial mínima en lógica de negocio será **≥ 70 %**.
- En criticidad **baja**, la cobertura diferencial mínima en lógica de negocio será **≥ 60 %**.
- Las excepciones a los umbrales requerirán aprobación de Arquitectura Empresarial, documentación de la exclusión, justificación de riesgo y plan de remediación con fecha de vencimiento.



## 9.7 Gestión de secretos

Toda credencial, clave, token, certificado privado u otro dato sensible de autenticación o cifrado deberá gestionarse mediante el **Vault** aprobado por Seguridad de la Información. Queda prohibido almacenar, transmitir o versionar secretos en código fuente, repositorios, imágenes de contenedor, logs, documentación, URLs, frontend o configuraciones embebidas en la aplicación.

### Alcance

Se consideran secretos, entre otros:

- Credenciales de bases de datos y servicios administrados.
- Claves de API y tokens de acceso.
- Client secrets de OAuth 2.0 / OpenID Connect.
- Claves privadas de certificados TLS.
- Claves de firma o cifrado (JWT, simétricas, asimétricas).
- Credenciales de cuentas técnicas y service accounts.
- Cadenas de conexión con usuario y contraseña.



### Principios obligatorios

- **Separación por ambiente:** no se reutilizarán secretos entre desarrollo, prueba, preproducción y producción.
- **Principio de mínimo privilegio:** cada aplicación accederá únicamente a los secretos que requiera.
- **Inyección en tiempo de ejecución:** los secretos se provisionarán al iniciar la aplicación o el contenedor, mediante el mecanismo de la plataforma (por ejemplo, referencias desde Kubernetes, variables inyectadas desde la bóveda o sidecar aprobado).
- **Rotación periódica:** los secretos de criticidad alta deberán rotarse conforme a la política corporativa; en ausencia de otra directriz, como máximo cada **90 días** para credenciales de base de datos, API keys y client secrets.
- **Sin secretos en artefactos:** las imágenes OCI, paquetes compilados y repositorios de código no deberán contener secretos en ningún formato.
- **Sin secretos en logs:** la aplicación no deberá registrar valores de secretos, tokens completos ni contraseñas; los errores de autenticación deberán registrarse sin exponer credenciales.
- **Plantillas de configuración:** el repositorio deberá incluir archivos de ejemplo (por ejemplo `.env.example` o equivalente) con nombres de variables pero **sin valores reales**.



### Requisitos por criticidad


| Requisito                    | Criticidad alta                                                    | Criticidad media                               | Criticidad baja                                       |
| ---------------------------- | ------------------------------------------------------------------ | ---------------------------------------------- | ----------------------------------------------------- |
| Vault                        | Obligatorio                                                        | Obligatorio                                    | Obligatorio o gestor nativo de la plataforma aprobado |
| Rotación de secretos         | Periódica y documentada; máximo 90 días para credenciales críticas | Documentada con responsable definido           | Según política del gestor o plataforma                |
| Auditoría de accesos         | Obligatoria                                                        | Recomendada                                    | Según plataforma                                      |
| Escaneo de secretos en CI/CD | Obligatorio; bloquea el pipeline                                   | Obligatorio; bloquea el pipeline               | Obligatorio; bloquea el pipeline                      |
| Secretos en historial de Git | Prohibido; remediación inmediata si se detecta                     | Prohibido; remediación inmediata si se detecta | Prohibido; remediación inmediata si se detecta        |
| Secretos en frontend         | Prohibido                                                          | Prohibido                                      | Prohibido                                             |




### Desarrollo local

- Los desarrolladores utilizarán secretos de **ambientes no productivos** obtenidos del vault o de un mecanismo aprobado por Seguridad de la Información.
- Los archivos locales con secretos (por ejemplo `.env`) deberán estar incluidos en `.gitignore` y no deberán subirse al repositorio.
- Queda prohibido compartir secretos por correo electrónico, mensajería instantánea, tickets o documentos no cifrados.



### Integración con CI/CD e infraestructura

- Los pipelines de CI/CD obtendrán credenciales de despliegue y publicación desde el vault o identidades de workload de corta duración; no desde variables persistentes en texto plano.
- La infraestructura como código referenciará secretos por identificador o ARN, nunca por valor literal.
- Ante detección de un secreto expuesto en el repositorio, el pipeline deberá **bloquearse** hasta completar la rotación del secreto comprometido y la remediación del historial o del código afectado.



### Prohibiciones

- Hardcodear secretos en código fuente, aunque sea en ramas de desarrollo.
- Almacenar secretos en variables de entorno definidas directamente en manifiestos versionados con valores reales.
- Exponer secretos en URLs, parámetros de consulta, cookies del navegador o almacenamiento local del frontend.
- Reutilizar el mismo secreto entre aplicaciones distintas salvo aprobación explícita de Seguridad de la Información.
- Desactivar o omitir el escaneo de secretos en el pipeline.

## 9.8 Control de versiones y ramas

Todo repositorio deberá gestionar su código fuente mediante Git, siguiendo la convención de ramas, commits y flujo de merge descrita a continuación.

### Nomenclatura de ramas

Las ramas de trabajo deberán nombrarse según su propósito:

| Tipo                  | Nomenclatura         | Propósito                                                          |
| --------------------- | --------------------- | -------------------------------------------------------------------- |
| Corrección de errores | `bugfix/nombre_rama`  | Corregir errores identificados en el código.                        |
| Nueva funcionalidad    | `feature/nombre_rama` | Agregar nuevas funcionalidades al proyecto.                          |
| Corrección urgente     | `hotfix/nombre_rama`  | Implementar correcciones rápidas que deban llegar a producción de manera urgente. |

### Merge hacia ramas finales

- Los cambios hacia las ramas finales — desarrollo, certificación y producción — solo podrán realizarse mediante un *merge request*.
- Todo *merge request* deberá incluir la documentación correspondiente al cambio, conforme al estándar de documentación definido en esta matriz (secciones 4.4 y 4.5).

### Nomenclatura de commits

Cada commit deberá seguir la convención `tipo(número_de_tarea): descripción`, utilizando alguno de los siguientes tipos:

| Tipo       | Uso                                                                 |
| ---------- | -------------------------------------------------------------------- |
| `feat`     | Nueva funcionalidad.                                                 |
| `fix`      | Corrección de errores.                                               |
| `docs`     | Cambios de documentación.                                            |
| `style`    | Cambios de formato que no afectan la lógica (espacios, indentación, etc.). |
| `refactor` | Cambios internos de código que no agregan funcionalidad ni corrigen errores. |
| `test`     | Adición o corrección de pruebas.                                     |
| `chore`    | Tareas de mantenimiento que no modifican código de producción.       |

Ejemplo: `feat(AXK0001): Control de IVA al 15%`  

### Flujo de merge

El flujo de integración deberá seguir el siguiente orden: rama local de trabajo → **desarrollo** → **certificación** → **producción**.

---



# 10. Política de versiones

Las versiones deberán expresarse contractualmente como:

“Versión LTS vigente, soportada y aprobada por el Grupo.”

El proveedor deberá:

- Mantener runtimes, frameworks y librerías en versiones soportadas.
- Aplicar parches de seguridad.
- Ejecutar actualizaciones durante la vigencia del contrato.
- Informar fechas de fin de soporte.
- Proponer planes de actualización.
- Evitar dependencias obsoletas.
- Mantener compatibilidad con el baseline corporativo.

El Grupo publicará un baseline tecnológico revisado al menos semestralmente.

El baseline deberá incluir:

- Runtime aprobado.
- Framework aprobado.
- Versión mínima.
- Versión recomendada.
- Fecha de fin de soporte.
- Imagen base corporativa.
- Herramientas de desarrollo.
- Herramientas de construcción.
- Herramientas de pruebas.
- Excepciones vigentes.
- Fecha de próxima revisión.

Las actualizaciones obligatorias del baseline no deberán considerarse cambios de alcance cuando sean necesarias para mantener la solución soportada y segura.

---



# 11. Regla de decisión resumida

1. Se utilizará monolito modular por defecto.
2. Java LTS y Spring Boot serán el backend preferente para aplicaciones empresariales y críticas.
3. Node.js LTS, TypeScript y NestJS se utilizarán para servicios livianos, integraciones y BFF.
4. Angular y TypeScript serán el frontend corporativo por defecto.
5. React y TypeScript serán una alternativa para productos digitales.
6. PHP no se utilizará para nuevos desarrollos.
7. Toda API deberá aplicar API-first y OpenAPI 3.x.
8. Toda aplicación deberá utilizar contenedores OCI, CI/CD y observabilidad.
9. OAuth 2.0 y OpenID Connect serán obligatorios para identidad y acceso.
10. Los microservicios requerirán justificación y aprobación.
11. Toda tecnología deberá encontrarse soportada y dentro del baseline corporativo.
12. Las pruebas unitarias serán obligatorias y la cobertura mínima deberá cumplirse según el nivel de criticidad (sección 9.6).
13. Todo repositorio deberá incluir un `README.md` y la documentación mínima definida en la sección 4.4.
14. Los secretos deberán gestionarse exclusivamente mediante el gestor corporativo aprobado; queda prohibido incluirlos en código, repositorios, imágenes o logs (sección 9.7).
15. Toda excepción deberá tener propietario, justificación, riesgo, plan de salida y fecha de vencimiento.

