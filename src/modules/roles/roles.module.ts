import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { RolesRepository } from './repositories/roles.repository';

@Module({
  providers: [RolesService, RolesRepository],
  controllers: [RolesController],
  exports: [RolesService, RolesRepository],
})
export class RolesModule {}
