import { ApiProperty } from '@nestjs/swagger';

/**
 * Producto encontrado en el CRM, con los nombres de columna de Creatio.
 *
 * @author Esteban
 * @since 2026-09-21
 */
export class ProductResponseDto {
  @ApiProperty({ description: 'Identificador del producto en el CRM.', format: 'uuid' })
  Id!: string;

  @ApiProperty({ example: 'Heladera' })
  Name!: string;

  @ApiProperty({ example: '90002756' })
  Code!: string;
}
