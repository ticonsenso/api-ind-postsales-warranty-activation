import { z } from 'zod';

/** Conjunto de entidades de las cuentas (clientes) de Creatio. */
export const ACCOUNT_ENTITY = 'Account';

/**
 * Columnas de la entidad de cuenta; las que empiezan con `IND` son columnas personalizadas de Indurama.
 *
 * Las columnas lookup (País, Provincia, Ciudad) se leen y escriben en OData v4 con el sufijo `Id`
 * (`CountryId`, ...), que contiene el GUID del registro relacionado.
 */
export const ACCOUNT_FIELDS = {
  id: 'Id',
  firstName: 'Name',
  lastName: 'INDApellido',
  phone: 'Phone',
  email: 'INDCorreo',
  identification: 'INDNumeroIdentificacion',
  countryId: 'CountryId',
  regionId: 'RegionId',
  cityId: 'CityId',
  privacyPolicyAccepted: 'INDPP',
  termsAccepted: 'INDTyC',
} as const;

/** Columna lookup del origen del cliente (lookup `INDOrigenCliente`); solo se escribe al registrar. */
export const ACCOUNT_ORIGIN_FIELD = 'INDOrigenId';

/** Valor "QR Garantía" del lookup `INDOrigenCliente`: identifica a los clientes registrados desde este canal. */
export const QR_WARRANTY_ORIGIN_ID = '5d40eb98-efc9-41e0-99c4-828014b9a01f';

const accountSchema = z.object({
  [ACCOUNT_FIELDS.id]: z.string(),
  [ACCOUNT_FIELDS.firstName]: z.string(),
  [ACCOUNT_FIELDS.lastName]: z.string().nullable(),
  [ACCOUNT_FIELDS.phone]: z.string().nullable(),
  [ACCOUNT_FIELDS.email]: z.string().nullable(),
  [ACCOUNT_FIELDS.identification]: z.string(),
  [ACCOUNT_FIELDS.countryId]: z.string().nullable(),
  [ACCOUNT_FIELDS.regionId]: z.string().nullable(),
  [ACCOUNT_FIELDS.cityId]: z.string().nullable(),
  [ACCOUNT_FIELDS.privacyPolicyAccepted]: z.boolean(),
  [ACCOUNT_FIELDS.termsAccepted]: z.boolean(),
});

/** Cuenta de Creatio con las columnas que consulta el BFF. */
export type CreatioAccount = z.infer<typeof accountSchema>;

/** Forma esperada de la respuesta de una consulta de cuentas: `value` viene vacío si no hay coincidencias. */
export const accountLookupSchema = z.object({ value: z.array(accountSchema) });
