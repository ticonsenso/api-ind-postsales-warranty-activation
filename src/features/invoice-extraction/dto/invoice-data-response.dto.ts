import { ApiProperty } from '@nestjs/swagger';

/**
 * Producto leído de la factura, tal como se expone al cliente.
 *
 * @author Cristian Brito
 * @since 2026-09-18
 */
export class InvoiceProductResponseDto {
  @ApiProperty()
  description!: string;

  @ApiProperty({ type: String, nullable: true })
  code!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  quantity!: number | null;
}

/**
 * Datos extraídos de la factura para pre-llenar el formulario; los ilegibles vienen en `null`.
 *
 * @author Cristian Brito
 * @since 2026-09-18
 */
export class InvoiceDataResponseDto {
  @ApiProperty({ type: String, nullable: true, example: '001-001-000123456' })
  invoiceNumber!: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Fecha de emisión (YYYY-MM-DD).', example: '2026-09-01' })
  issueDate!: string | null;

  @ApiProperty({ type: String, nullable: true })
  sellerName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  buyerName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  buyerIdentification!: string | null;

  @ApiProperty({ type: [InvoiceProductResponseDto] })
  products!: InvoiceProductResponseDto[];

  @ApiProperty({
    description: 'Calidad de la imagen de 0 a 1: 1 nítida y completa, 0.5 media (costó leerla), 0 inutilizable.',
    minimum: 0,
    maximum: 1,
    example: 0.9,
  })
  scoreImage!: number;

  @ApiProperty({
    description:
      'Confiabilidad de la lectura de 0 a 1: 1 fiel a lo impreso, 0.5 media. Con 0.3 o menos la lectura se rechaza.',
    minimum: 0,
    maximum: 1,
    example: 1,
  })
  scoreResult!: number;
}
