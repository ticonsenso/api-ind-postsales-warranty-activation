import { Module } from '@nestjs/common';
import { openAiClientProvider } from './openai-client.provider';
import { OpenAiService } from './openai.service';

/**
 * Integración con Azure OpenAI, disponible para cualquier feature que la necesite.
 *
 * Exporta solo `OpenAiService`; el cliente del SDK es un detalle interno.
 *
 * @author Cristian Brito
 * @since 2026-09-21
 */
@Module({
  providers: [openAiClientProvider, OpenAiService],
  exports: [OpenAiService],
})
export class OpenAiModule {}
