import { Module } from '@nestjs/common';
import { CreatioModule } from '../../infrastructure/creatio/creatio.module';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

/**
 * Módulo de consulta de clientes, con arquitectura por capas: controller → service.
 *
 * La integración con Creatio vive en `infrastructure/` y se importa como módulo. Exporta `ClientsService` para que
 * el registro de la garantía cree la cuenta del cliente nuevo en el mismo paso.
 *
 * @author Esteban
 * @since 2026-09-21
 */
@Module({
  imports: [CreatioModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
