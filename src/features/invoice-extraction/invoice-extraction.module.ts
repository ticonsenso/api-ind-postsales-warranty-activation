import { Module } from '@nestjs/common';
import { OpenAiModule } from '../../infrastructure/openai/openai.module';
import { InvoiceFileModule } from '../../common/invoice-file/invoice-file.module';
import { InvoiceExtractionController } from './invoice-extraction.controller';
import { InvoiceExtractionService } from './invoice-extraction.service';

/**
 * Módulo de la lectura de facturas con IA: recibe el archivo y devuelve los datos extraídos.
 *
 * @author Cristian Brito
 * @since 2026-09-21
 */
@Module({
  imports: [InvoiceFileModule, OpenAiModule],
  controllers: [InvoiceExtractionController],
  providers: [InvoiceExtractionService],
})
export class InvoiceExtractionModule {}
