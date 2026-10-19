import { ApiProperty } from '@nestjs/swagger';

/**
 * Garantía registrada, tal como se expone al cliente.
 *
 * @author Cristian Brito
 * @since 2026-09-18
 */
export class WarrantyResponseDto {
  @ApiProperty({ description: 'Identificador de la garantía en el CRM.', format: 'uuid' })
  warrantyId!: string;
}
