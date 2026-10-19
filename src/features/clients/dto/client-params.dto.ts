import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';
import {
  IDENTIFICATION_MAX_LENGTH,
  IDENTIFICATION_MIN_LENGTH,
  IDENTIFICATION_PATTERN,
} from '../../../common/constants/identification.constants';
import { trim } from '../../../common/transformers/trim.transformer';

/**
 * Parámetros de ruta de la consulta de un cliente.
 *
 * @author Esteban
 * @since 2026-09-21
 */
export class ClientParamsDto {
  @ApiProperty({ description: 'Cédula, RUC o pasaporte del cliente.', example: '0190072002001' })
  @Transform(trim)
  @IsString()
  @Length(IDENTIFICATION_MIN_LENGTH, IDENTIFICATION_MAX_LENGTH)
  @Matches(IDENTIFICATION_PATTERN)
  identification!: string;
}
