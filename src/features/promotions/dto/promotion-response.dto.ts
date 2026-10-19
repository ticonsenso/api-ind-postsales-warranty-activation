import { ApiProperty } from '@nestjs/swagger';

/**
 * Promoción (banner) vigente del CRM, con los nombres de columna de Creatio.
 *
 * @author Esteban
 * @since 2026-10-13
 */
export class PromotionResponseDto {
  @ApiProperty({ description: 'Identificador de la promoción en el CRM.', format: 'uuid' })
  Id!: string;

  @ApiProperty({ example: 'Promoción de verano' })
  INDName!: string;

  @ApiProperty({ description: 'URL de la imagen del banner.' })
  INDImageUrl!: string;

  @ApiProperty({ description: 'Texto alternativo de la imagen.' })
  INDTextoAlternativo!: string;

  @ApiProperty({ description: 'Enlace de destino al hacer clic; null si no tiene.', nullable: true, type: String })
  INDLinkDestino!: string | null;

  @ApiProperty({ description: 'Posición en que se muestra; menor primero.' })
  INDOrden!: number;

  @ApiProperty()
  INDActivo!: boolean;

  @ApiProperty({ description: 'Si el enlace debe abrirse en una pestaña nueva.' })
  INDNuevaPestania!: boolean;

  @ApiProperty({ description: 'Inicio de vigencia (ISO 8601); null si no tiene límite.', nullable: true, type: String })
  INDVigenciaDesde!: string | null;

  @ApiProperty({ description: 'Fin de vigencia (ISO 8601); null si no tiene límite.', nullable: true, type: String })
  INDVigenciaHasta!: string | null;
}
