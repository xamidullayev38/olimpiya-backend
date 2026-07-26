import { Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';
import { AuditLogRepository } from './repositories/audit-log.repository';

@Module({
  providers: [AuditLogService, AuditLogRepository],
  controllers: [AuditLogController],
  exports: [AuditLogService, AuditLogRepository],
})
export class AuditLogModule {}
