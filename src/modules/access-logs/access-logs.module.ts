import { Module } from '@nestjs/common';
import { AccessLogsService } from './access-logs.service';
import { AccessLogsController } from './access-logs.controller';
import { AccessLogRepository } from './repositories/access-logs.repository';

@Module({
  providers: [AccessLogsService, AccessLogRepository],
  controllers: [AccessLogsController],
  exports: [AccessLogsService, AccessLogRepository],
})
export class AccessLogsModule {}
