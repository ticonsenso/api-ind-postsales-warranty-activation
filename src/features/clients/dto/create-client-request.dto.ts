import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Equals, IsEmail, IsString, IsUUID, Length, Matches } from 'class-validator';
import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  PHONE_MIN_LENGTH,
  PHONE_PATTERN,
} from '../../../common/constants/contact.constants';
import {
  IDENTIFICATION_MAX_LENGTH,
  IDENTIFICATION_MIN_LENGTH,
  IDENTIFICATION_PATTERN,
} from '../../../common/constants/identification.constants';
import { trim } from '../../../common/transformers/trim.transformer';

/**
 * Datos para registrar un cliente nuevo, con los nombres de columna de la cuenta de Creatio.
 *
 * El identificador (`Id`) no viene en el body: lo aporta la clave de idempotencia.
 *
 * @author Esteban
 * @since 2026-09-21
 */
export class CreateClientRequestDto {
  @ApiProperty({ example: 'Carlos' })
  @Transform(trim)
  @IsString()
  @Length(1, NAME_MAX_LENGTH)
  Name!: string;

  @ApiProperty({ example: 'Mendoza' })
  @Transform(trim)
  @IsString()
  @Length(1, NAME_MAX_LENGTH)
  INDApellido!: string;

  @ApiProperty({ example: '+593 99 876 5432' })
  @Transform(trim)
  @IsString()
  @Length(PHONE_MIN_LENGTH, PHONE_MAX_LENGTH)
  @Matches(PHONE_PATTERN)
  Phone!: string;

  @ApiProperty({ example: 'carlos.mendoza@example.com' })
  @Transform(trim)
  @IsEmail()
  @Length(1, EMAIL_MAX_LENGTH)
  INDCorreo!: string;

  @ApiProperty({ description: 'Cédula, RUC o pasaporte del cliente.', example: '0912345678' })
  @Transform(trim)
  @IsString()
  @Length(IDENTIFICATION_MIN_LENGTH, IDENTIFICATION_MAX_LENGTH)
  @Matches(IDENTIFICATION_PATTERN)
  INDNumeroIdentificacion!: string;

  @ApiProperty({ description: 'País (GUID del lookup `Country` de Creatio).', format: 'uuid' })
  @IsUUID()
  CountryId!: string;

  @ApiProperty({ description: 'Provincia (GUID del lookup `Region` de Creatio).', format: 'uuid' })
  @IsUUID()
  RegionId!: string;

  @ApiProperty({ description: 'Ciudad (GUID del lookup `City` de Creatio).', format: 'uuid' })
  @IsUUID()
  CityId!: string;

  @ApiProperty({ description: 'Aceptación de la política de privacidad; debe ser `true`.', example: true })
  @Equals(true, { message: 'Debe aceptar la política de privacidad.' })
  INDPP!: boolean;

  @ApiProperty({ description: 'Aceptación de los términos y condiciones; debe ser `true`.', example: true })
  @Equals(true, { message: 'Debe aceptar los términos y condiciones.' })
  INDTyC!: boolean;
}
