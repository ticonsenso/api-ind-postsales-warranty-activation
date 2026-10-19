import { Module } from '@nestjs/common';
import { CreatioModule } from '../../infrastructure/creatio/creatio.module';
import { InvoiceFileModule } from '../../common/invoice-file/invoice-file.module';
import { ClientsModule } from '../clients/clients.module';
import { WarrantiesController } from './warranties.controller';
import { WarrantiesService } from './warranties.service';

/**
 * Módulo del registro de garantías, con arquitectura por capas: controller → service.
 *
 * La integración con Creatio vive en `infrastructure/` y la recepción del archivo en `invoice-file/`;
 * ambas se importan como módulos. La cuenta del cliente la gestiona `ClientsModule`.
 *
 * @author Cristian Brito
 * @since 2026-09-18
 */
@Module({
  imports: [CreatioModule, InvoiceFileModule, ClientsModule],
  controllers: [WarrantiesController],
  providers: [WarrantiesService],
})
export class WarrantiesModule {}
