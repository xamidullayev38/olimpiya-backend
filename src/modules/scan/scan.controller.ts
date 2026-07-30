import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ScanService } from './scan.service';
import { ScanAccessDto } from './dto/scan-access.dto';
import { ScanMealDto } from './dto/scan-meal.dto';
import { DeviceAuthGuard } from '../../common/guards/device-auth.guard';
import { CurrentDevice, AuthenticatedDevice } from '../../common/decorators/device.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// Skaner qurilmalari uchun MUSTAQIL autentifikatsiya (DeviceAuthGuard) - staff JWT bilan aralashtirilmaydi.
// @Public() global JwtAuthGuard'ni chetlab o'tadi (chunki bu yerda "Authorization: Bearer" emas,
// "Authorization: Device <token>" ishlatiladi); DeviceAuthGuard esa haqiqiy autentifikatsiyani bajaradi.
// Har bir qurilma uchun cheklovli throttle (NFT-1: 200+ parallel qurilma, lekin bitta qurilma spam qilmasin).
@Public()
@UseGuards(DeviceAuthGuard)
@Controller({ path: 'scan', version: '1' })
export class ScanController {
  constructor(private service: ScanService) {}

  @Throttle({ default: { limit: 5, ttl: 1000 } })
  @Post('access')
  scanAccess(@Body() dto: ScanAccessDto, @CurrentDevice() device: AuthenticatedDevice) {
    return this.service.scanAccess(dto, { deviceId: device.deviceId });
  }

  @Throttle({ default: { limit: 5, ttl: 1000 } })
  @Post('meal')
  scanMeal(@Body() dto: ScanMealDto, @CurrentDevice() device: AuthenticatedDevice) {
    return this.service.scanMeal(dto, { deviceId: device.deviceId });
  }

  @Get('recent')
  recent(@CurrentDevice() device: AuthenticatedDevice) {
    return this.service.getRecentScans(device.deviceId);
  }

  // Admin panel uchun faqat token haqiqiyligini tekshirish
  @Public() // Because we'll check token inside manually or use JwtAuthGuard at method level if needed, but let's just use JwtAuthGuard
  @UseGuards(JwtAuthGuard)
  @Post('verify')
  verifyToken(@Body('qrToken') qrToken: string) {
    return this.service.verifyQrTokenForAdmin(qrToken);
  }
}
