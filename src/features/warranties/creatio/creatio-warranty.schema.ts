/**
 * Nombres de entidades y columnas de Creatio usados por el registro de garantías.
 *
 * La garantía se registra como un "Producto en cliente" (`INDProductoEnCliente`) que apunta a la cuenta
 * del cliente y al producto. Las columnas lookup se escriben en OData v4 con el sufijo `Id`.
 * Al ser el único lugar donde aparecen, un cambio de esquema en el CRM se resuelve editando solo este archivo.
 */

/** Conjunto de entidades de los productos de cliente (registro de la garantía). */
export const WARRANTY_ENTITY = 'INDProductoEnCliente';

/** Columnas del producto de cliente. */
export const WARRANTY_FIELDS = {
  id: 'Id',
  clientId: 'INDClienteId',
  productId: 'INDProductId',
  serialNumber: 'INDNombre',
  purchaseDate: 'INDFecha',
  invoiceNumber: 'INDNumComprobante',
  issuer: 'INDEmisor',
  warrantyTypeId: 'INDGarantiaId',
} as const;

/** Valor "Garantía" del lookup `INDGarantia`: tipo de cobertura de los registros hechos desde este canal. */
export const STANDARD_WARRANTY_TYPE_ID = 'f065d915-9741-4530-886e-1fd2fd802244';

/**
 * Conjunto de entidades de los adjuntos: `SysFile`, el almacenamiento que usa la lista de adjuntos de la página
 * del producto de cliente (no existe `INDProductoEnClienteFile`). El archivo se vincula al registro por nombre de
 * esquema e `Id`, no por lookup. Se sube con `FileApiService`, que completa `Size`, `TypeId` y el grupo
 * "Archivos adjuntos" por su cuenta.
 */
export const WARRANTY_FILE_ENTITY = 'SysFile';

/** Columnas de `SysFile` que vinculan el adjunto con la garantía. */
export const WARRANTY_FILE_FIELDS = {
  recordSchemaName: 'RecordSchemaName',
  recordId: 'RecordId',
} as const;
