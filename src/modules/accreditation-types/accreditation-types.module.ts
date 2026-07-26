import { Module } from '@nestjs/common';
import { AccreditationTypesService } from './accreditation-types.service';
import { AccreditationTypesController } from './accreditation-types.controller';
import { AccreditationTypeRepository } from './repositories/accreditation-types.repository';

@Module({
  providers: [AccreditationTypesService, AccreditationTypeRepository],
  controllers: [AccreditationTypesController],
  exports: [AccreditationTypesService, AccreditationTypeRepository],
})
export class AccreditationTypesModule {}
