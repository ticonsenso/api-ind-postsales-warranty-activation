import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { Env } from '../../config/env.validation';

const MAX_FORM_FIELDS = 20;
const MAX_FORM_FIELD_BYTES = 10 * 1024;

/**
 * Recepción de facturas por `multipart/form-data`, compartida por las features que las reciben.
 *
 * Configura los límites de Multer (un archivo, tamaño máximo por variable de entorno) y los reexporta:
 * el módulo que declare un controller con `FileInterceptor` solo debe importar este módulo.
 *
 * @author Cristian Brito
 * @since 2026-09-21
 */
@Module({
  imports: [
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        limits: {
          files: 1,
          fileSize: config.get('MAX_INVOICE_FILE_BYTES', { infer: true }),
          fields: MAX_FORM_FIELDS,
          fieldSize: MAX_FORM_FIELD_BYTES,
        },
      }),
    }),
  ],
  exports: [MulterModule],
})
export class InvoiceFileModule {}
