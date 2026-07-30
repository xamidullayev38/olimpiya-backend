import { Body, Controller, Get, Param, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DeviceLoginDto } from './dto/device-login.dto';
import { SelectZoneDto } from './dto/select-zone.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { DeviceAuthGuard } from '../../common/guards/device-auth.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuditAction } from '../../common/decorators/audit-action.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentDevice, AuthenticatedDevice } from '../../common/decorators/device.decorator';

@Controller({ path: 'devices', version: '1' })
export class DevicesController {
  constructor(private service: DevicesService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('device.manage')
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('device.manage')
  @AuditAction('device.create')
  @Post()
  create(@Body() dto: CreateDeviceDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('device.manage')
  @AuditAction('device.revoke')
  @Post(':id/revoke')
  revoke(@Param('id') id: string) {
    return this.service.revoke(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('device.manage')
  @AuditAction('device.update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDeviceDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('device.manage')
  @AuditAction('device.delete')
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  // Mobil ilova shu endpoint orqali kiradi (staff JWT emas, qurilma kaliti)
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: DeviceLoginDto) {
    return this.service.login(dto);
  }

  @Public()
  @UseGuards(DeviceAuthGuard)
  @Post('select-zone')
  selectZone(@CurrentDevice() device: AuthenticatedDevice, @Body() dto: SelectZoneDto) {
    return this.service.selectZone(device.deviceId, dto.zoneId);
  }
}
