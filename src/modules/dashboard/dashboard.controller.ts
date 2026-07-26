import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('report.view')
@Controller({ path: 'dashboard', version: '1' })
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('live-stats')
  liveStats() {
    return this.service.getLiveStats();
  }
}
