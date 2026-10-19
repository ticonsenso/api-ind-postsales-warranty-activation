import { ApiProperty } from '@nestjs/swagger';

/**
 * Cliente encontrado en el CRM, con los nombres de columna de la cuenta de Creatio.
 *
 * @author Esteban
 * @since 2026-09-21
 */
export class ClientResponseDto {
  @ApiProperty({ description: 'Identificador del cliente en el CRM.', format: 'uuid' })
  Id!: string;

  @ApiProperty({ example: 'Carlos' })
  Name!: string;

  @ApiProperty({ type: String, nullable: true, example: 'Mendoza' })
  INDApellido!: string | null;

  @ApiProperty({ type: String, nullable: true, example: '+593 99 876 5432' })
  Phone!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'carlos.mendoza@example.com' })
  INDCorreo!: string | null;

  @ApiProperty({ description: 'Cédula, RUC o pasaporte del cliente.', example: '0912345678' })
  INDNumeroIdentificacion!: string;

  @ApiProperty({ type: String, nullable: true, description: 'País (GUID del lookup `Country`).', format: 'uuid' })
  CountryId!: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Provincia (GUID del lookup `Region`).', format: 'uuid' })
  RegionId!: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Ciudad (GUID del lookup `City`).', format: 'uuid' })
  CityId!: string | null;

  @ApiProperty({ description: 'Aceptó la política de privacidad.', example: true })
  INDPP!: boolean;

  @ApiProperty({ description: 'Aceptó los términos y condiciones.', example: true })
  INDTyC!: boolean;
}
