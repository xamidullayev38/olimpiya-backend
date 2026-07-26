import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogService, AuditLogQuery } from './audit-log.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('audit_log.view')
@Controller({ path: 'audit-logs', version: '1' })
export class AuditLogController {
  constructor(private service: AuditLogService) {}

  @Get()
  findAll(@Query() query: AuditLogQuery) {
    return this.service.findAll(query);
  }
}
