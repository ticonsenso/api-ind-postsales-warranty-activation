import { Injectable } from '@nestjs/common';
import { OpenAiService } from '../../infrastructure/openai/openai.service';
import { InvoiceFile } from '../../common/invoice-file/invoice-file';
import { InvoiceDataResponseDto } from './dto/invoice-data-response.dto';
import {
  createEmptyInvoiceData,
  hasUsefulInvoiceData,
  toFileContent,
  toInvoiceData,
} from './openai/invoice-extraction.mapper';
import { INVOICE_EXTRACTION_INSTRUCTIONS, INVOICE_EXTRACTION_USER_PROMPT } from './openai/invoice-extraction.prompt';
import { INVOICE_EXTRACTION_SCHEMA_NAME, invoiceExtractionSchema } from './openai/invoice-extraction.schema';
import { InvoiceUnreadableError } from './errors/invoice-unreadable.error';

/** Con este `scoreResult` o menos la lectura es tan poco fiable que se rechaza como error de lectura. */
const MAX_UNRELIABLE_SCORE_RESULT = 0.3;

/**
 * Servicio que lee una factura con Azure OpenAI Vision para pre-llenar el formulario de garantía.
 *
 * Existe para que el cliente revise los datos extraídos antes de registrar la garantía. La llamada al
 * proveedor la hace `OpenAiService`; aquí solo se arma el pedido de la factura y se aplican sus reglas.
 *
 * @author Cristian Brito
 * @since 2026-09-18
 */
@Injectable()
export class InvoiceExtractionService {
  constructor(private readonly openAi: OpenAiService) {}

  /**
   * Envía la factura a OpenAI y devuelve los datos extraídos y normalizados.
   *
   * @param invoice - Factura ya validada en tipo y tamaño
   * @returns Datos estructurados de la factura con su `scoreImage` y `scoreResult`; los ilegibles vienen en `null`
   * @throws {InvoiceUnreadableError} Si la fiabilidad de la lectura es muy baja (`scoreResult` de 0.3 o menos) o
   *   no se pudo leer ningún dato relevante
   * @throws {ExternalServiceError} Si OpenAI no responde o rechaza la solicitud
   */
  async extract(invoice: InvoiceFile): Promise<InvoiceDataResponseDto> {
    const extraction = await this.openAi.parseStructuredOutput({
      instructions: INVOICE_EXTRACTION_INSTRUCTIONS,
      content: [{ type: 'input_text', text: INVOICE_EXTRACTION_USER_PROMPT }, toFileContent(invoice)],
      schema: invoiceExtractionSchema,
      schemaName: INVOICE_EXTRACTION_SCHEMA_NAME,
    });
    const data = extraction ? toInvoiceData(extraction) : createEmptyInvoiceData();
    if (data.scoreResult <= MAX_UNRELIABLE_SCORE_RESULT || !hasUsefulInvoiceData(data)) {
      throw new InvoiceUnreadableError();
    }
    return data;
  }
}
