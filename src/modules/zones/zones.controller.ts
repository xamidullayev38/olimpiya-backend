import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ZonesService } from './zones.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuditAction } from '../../common/decorators/audit-action.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'zones', version: '1' })
export class ZonesController {
  constructor(private service: ZonesService) {}

  @RequirePermissions('report.view')
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @RequirePermissions('report.view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @RequirePermissions('report.view')
  @Get(':id/occupancy')
  occupancy(@Param('id') id: string) {
    return this.service.getCurrentOccupancy(id);
  }

  @RequirePermissions('zone.manage')
  @AuditAction('zone.create')
  @Post()
  create(@Body() dto: CreateZoneDto) {
    return this.service.create(dto);
  }

  @RequirePermissions('zone.manage')
  @AuditAction('zone.update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateZoneDto) {
    return this.service.update(id, dto);
  }

  @RequirePermissions('zone.manage')
  @AuditAction('zone.deactivate')
  @Post(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }
}
