import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';
import { trim } from '../../../common/transformers/trim.transformer';

/** Largo máximo del código de material en SAP (`MATNR`). */
const SAP_CODE_MAX_LENGTH = 40;
const SAP_CODE_PATTERN = /^[A-Za-z0-9]+$/;

/**
 * Parámetros de ruta de la consulta de un producto por su código SAP.
 *
 * @author Cristian Brito
 * @since 2026-11-18
 */
export class ProductCodeParamsDto {
  @ApiProperty({ description: 'Código SAP del producto (columna `Code` de Creatio).', example: '90002756' })
  @Transform(trim)
  @IsString()
  @Length(1, SAP_CODE_MAX_LENGTH)
  @Matches(SAP_CODE_PATTERN)
  code!: string;
}
