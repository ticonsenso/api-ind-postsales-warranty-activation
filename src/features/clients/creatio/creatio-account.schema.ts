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

/** Columna lookup del tipo de persona; solo se escribe al registrar. */
export const ACCOUNT_PERSON_TYPE_FIELD = 'INDTipoPersonaId';

/** Tipo de persona con el que se registran todos los clientes de este canal. */
export const PERSON_TYPE_ID = '7f7b54c6-bdaf-4faf-8ee6-0a4b23ed09a8';

/** Columna lookup del tipo de identificación; solo se escribe al registrar. */
export const ACCOUNT_IDENTIFICATION_TYPE_FIELD = 'INDTipoIFId';

/** Tipo de identificación "RUC": identificaciones de 13 dígitos. */
export const RUC_IDENTIFICATION_TYPE_ID = '7e1e3a1f-0db2-45ab-b453-651aac81c67a';

/** Tipo de identificación "Cédula": cualquier identificación que no sea RUC. */
export const CEDULA_IDENTIFICATION_TYPE_ID = '252d6ca7-1ecf-4f5a-9a10-baabe962eb62';

const RUC_LENGTH = 13;

/** Devuelve el tipo de identificación según su longitud: RUC si tiene 13 caracteres, Cédula en otro caso. */
export function identificationTypeIdFor(identification: string): string {
  return identification.length === RUC_LENGTH ? RUC_IDENTIFICATION_TYPE_ID : CEDULA_IDENTIFICATION_TYPE_ID;
}

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
