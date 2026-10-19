import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';
import { trim } from '../../../common/transformers/trim.transformer';

/** Largo máximo del número de serie en SAP (`SERNR`). */
const SERIAL_NUMBER_MAX_LENGTH = 18;
const SERIAL_NUMBER_PATTERN = /^[A-Za-z0-9]+$/;

/**
 * Parámetros de ruta de la consulta de un producto por número de serie.
 *
 * @author Cristian Brito
 * @since 2026-10-01
 */
export class ProductSerialParamsDto {
  @ApiProperty({ description: 'Número de serie del producto (SAP).', example: '6500304730294' })
  @Transform(trim)
  @IsString()
  @Length(1, SERIAL_NUMBER_MAX_LENGTH)
  @Matches(SERIAL_NUMBER_PATTERN)
  serialNumber!: string;
}
