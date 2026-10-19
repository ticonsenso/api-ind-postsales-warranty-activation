import { OmitType } from '@nestjs/swagger';
import { CreateClientRequestDto } from '../../clients/dto/create-client-request.dto';

/**
 * Datos del cliente nuevo que se registra junto con la garantía, con los nombres de columna de la cuenta de Creatio.
 *
 * Los consentimientos no van aquí: se envían en el cuerpo de la garantía porque también los acepta un cliente
 * existente.
 *
 * @author Esteban
 * @since 2026-10-08
 */
export class NewClientDto extends OmitType(CreateClientRequestDto, ['INDPP', 'INDTyC'] as const) {}
