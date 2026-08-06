import { Body, Controller, Get, Post, UseGuards, Headers } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ScanService } from './scan.service';
import { ScanAccessDto } from './dto/scan-access.dto';
import { ScanMealDto } from './dto/scan-meal.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller({ path: 'scan', version: '1' })
export class ScanController {
  constructor(private service: ScanService) {}

  @Throttle({ default: { limit: 5, ttl: 1000 } })
  @Post('access')
  scanAccess(@Body() dto: ScanAccessDto, @Headers('x-device-id') deviceId: string) {
    return this.service.scanAccess(dto, { deviceId });
  }

  @Throttle({ default: { limit: 5, ttl: 1000 } })
  @Post('meal')
  scanMeal(@Body() dto: ScanMealDto, @Headers('x-device-id') deviceId: string) {
    return this.service.scanMeal(dto, { deviceId });
  }

  @Get('recent')
  recent(@Headers('x-device-id') deviceId: string) {
    return this.service.getRecentScans(deviceId);
  }

  @Post('verify')
  verifyToken(@Body('qrToken') qrToken: string) {
    return this.service.verifyQrTokenForAdmin(qrToken);
  }
}
