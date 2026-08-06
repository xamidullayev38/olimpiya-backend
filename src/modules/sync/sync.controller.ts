import { Body, Controller, Get, Post, UseGuards, Headers } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SyncService } from './sync.service';
import { UploadLogsDto } from './dto/upload-logs.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller({ path: 'sync', version: '1' })
export class SyncController {
  constructor(private service: SyncService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Get('offline-package')
  getPackage(@Headers('x-device-id') deviceId: string) {
    return this.service.getOfflinePackage(deviceId);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('upload-logs')
  uploadLogs(@Body() dto: UploadLogsDto, @Headers('x-device-id') deviceId: string) {
    return this.service.uploadLogs(dto, deviceId);
  }
}
