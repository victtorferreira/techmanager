import { Module } from '@nestjs/common';
import { ServiceOrdersController } from './service-orders.controller';
import { PublicRepairRequestsController } from './public-repair-requests.controller';
import { ServiceOrdersService } from './service-orders.service';
@Module({ controllers: [ServiceOrdersController, PublicRepairRequestsController], providers: [ServiceOrdersService] })
export class ServiceOrdersModule {}
