import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';
import { AccreditationTypesService } from './accreditation-types.service';
import { CreateAccreditationTypeDto } from './dto/create-accreditation-type.dto';
import { UpdateAccreditationTypeDto } from './dto/update-accreditation-type.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuditAction } from '../../common/decorators/audit-action.decorator';

class SetZonesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  zoneIds: string[];
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'accreditation-types', version: '1' })
export class AccreditationTypesController {
  constructor(private service: AccreditationTypesService) {}

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

  @RequirePermissions('accreditation_type.manage')
  @AuditAction('accreditation_type.create')
  @Post()
  create(@Body() dto: CreateAccreditationTypeDto) {
    return this.service.create(dto);
  }

  @RequirePermissions('accreditation_type.manage')
  @AuditAction('accreditation_type.update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAccreditationTypeDto) {
    return this.service.update(id, dto);
  }

  @RequirePermissions('accreditation_type.manage')
  @AuditAction('accreditation_type.set_zones')
  @Post(':id/zones')
  setZones(@Param('id') id: string, @Body() dto: SetZonesDto) {
    return this.service.setAllowedZones(id, dto.zoneIds);
  }

  @RequirePermissions('accreditation_type.manage')
  @AuditAction('accreditation_type.deactivate')
  @Post(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }
}
