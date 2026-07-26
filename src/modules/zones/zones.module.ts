import { Module } from '@nestjs/common';
import { ZonesService } from './zones.service';
import { ZonesController } from './zones.controller';
import { ZoneRepository } from './repositories/zones.repository';
import { AccessLogRepository } from '../access-logs/repositories/access-logs.repository';

@Module({
  providers: [ZonesService, ZoneRepository, AccessLogRepository],
  controllers: [ZonesController],
  exports: [ZonesService, ZoneRepository],
})
export class ZonesModule {}
