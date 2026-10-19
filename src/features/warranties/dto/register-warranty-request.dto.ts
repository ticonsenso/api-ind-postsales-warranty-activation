import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  Equals,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsString,
  IsUUID,
  Length,
  Matches,
  Validate,
  ValidateIf,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { toFormBoolean } from '../../../common/transformers/form-boolean.transformer';
import { trim } from '../../../common/transformers/trim.transformer';
import { NewClientDto } from './new-client.dto';

const PRODUCT_FIELD_MAX_LENGTH = 100;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Exige que la garantía apunte a un cliente existente (`clientId`) o traiga uno nuevo (`newClient`), no ambos. */
@ValidatorConstraint({ name: 'exactlyOneClientReference' })
class ExactlyOneClientReference implements ValidatorConstraintInterface {
  validate(_value: unknown, { object }: ValidationArguments): boolean {
    const { clientId, newClient } = object as RegisterWarrantyRequestDto;
    return (clientId === undefined) !== (newClient === undefined);
  }
}

/**
 * Datos del formulario de registro de garantía (se envían junto al archivo de la factura).
 *
 * El cliente llega de una de dos formas: `clientId` si ya existe en el CRM, o `newClient` con sus datos si hay que
 * registrarlo; nunca ambas. Así la cuenta del cliente nuevo se crea en el mismo paso que la garantía.
 *
 * @author Cristian Brito
 * @since 2026-09-18
 */
export class RegisterWarrantyRequestDto {
  @ApiPropertyOptional({
    description: 'Identificador del cliente existente en el CRM (`Id` de la cuenta). Excluyente con `newClient`.',
    format: 'uuid',
  })
  @ValidateIf((dto: RegisterWarrantyRequestDto) => dto.clientId !== undefined || dto.newClient === undefined)
  @Transform(trim)
  @Validate(ExactlyOneClientReference)
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    type: NewClientDto,
    description:
      'Datos del cliente nuevo, que se registra junto con la garantía. Excluyente con `clientId`. ' +
      'En multipart cada dato va con notación de corchetes: `newClient[Name]`, `newClient[INDApellido]`, ...',
  })
  @ValidateIf((dto: RegisterWarrantyRequestDto) => dto.clientId === undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => NewClientDto)
  newClient?: NewClientDto;

  @ApiProperty({ description: 'Aceptación de la política de privacidad; debe ser `true`.', example: true })
  @Transform(toFormBoolean)
  @Equals(true, { message: 'Debe aceptar la política de privacidad.' })
  INDPP!: boolean;

  @ApiProperty({ description: 'Aceptación de los términos y condiciones; debe ser `true`.', example: true })
  @Transform(toFormBoolean)
  @Equals(true, { message: 'Debe aceptar los términos y condiciones.' })
  INDTyC!: boolean;

  @ApiProperty({ description: 'Identificador del producto en el CRM (`Id` del producto).', format: 'uuid' })
  @Transform(trim)
  @IsUUID()
  productId!: string;

  @ApiProperty({ description: 'Número de serie del producto.', example: 'SN123456789' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @Length(1, PRODUCT_FIELD_MAX_LENGTH)
  serialNumber!: string;

  @ApiProperty({ description: 'Número de la factura de compra.', example: '001-001-000123456' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @Length(1, PRODUCT_FIELD_MAX_LENGTH)
  invoiceNumber!: string;

  @ApiProperty({ description: 'Fecha de compra (YYYY-MM-DD).', example: '2026-09-01' })
  @Transform(trim)
  @Matches(DATE_ONLY_PATTERN)
  @IsISO8601({ strict: true })
  purchaseDate!: string;

  @ApiProperty({ description: 'Establecimiento que emitió la factura.', example: 'Almacén Centro' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @Length(1, PRODUCT_FIELD_MAX_LENGTH)
  storeName!: string;
}
