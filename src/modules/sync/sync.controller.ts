import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SyncService } from './sync.service';
import { UploadLogsDto } from './dto/upload-logs.dto';
import { DeviceAuthGuard } from '../../common/guards/device-auth.guard';
import { CurrentDevice, AuthenticatedDevice } from '../../common/decorators/device.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@UseGuards(DeviceAuthGuard)
@Controller({ path: 'sync', version: '1' })
export class SyncController {
  constructor(private service: SyncService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Get('offline-package')
  getPackage(@CurrentDevice() device: AuthenticatedDevice) {
    return this.service.getOfflinePackage(device.deviceId);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('upload-logs')
  uploadLogs(@Body() dto: UploadLogsDto, @CurrentDevice() device: AuthenticatedDevice) {
    return this.service.uploadLogs(dto, device.deviceId);
  }
}
