import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DeviceStatus } from '@prisma/client';
import { DeviceRepository } from '../../modules/devices/repositories/devices.repository';

/**
 * Mobil skaner qurilmalari uchun alohida autentifikatsiya kanali (Phase 4: Device Auth).
 * Staff JWT'dan MUSTAQIL maxfiy kalit bilan imzolangan device-token talab qilinadi
 * (Authorization: Device <token> header orqali).
 */
@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
    private deviceRepo: DeviceRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Device ')) {
      throw new UnauthorizedException('Qurilma tokeni talab qilinadi');
    }

    const token = authHeader.replace('Device ', '').trim();

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get<string>('DEVICE_TOKEN_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Qurilma tokeni yaroqsiz yoki muddati tugagan');
    }

    const device = await this.deviceRepo.findById(payload.sub);
    if (!device || device.status !== DeviceStatus.ACTIVE) {
      throw new UnauthorizedException('Qurilma bloklangan yoki mavjud emas');
    }

    await this.deviceRepo.update(device.id, {
      lastSeenAt: new Date(),
      lastSeenIp: request.ip,
    });

    request.device = { deviceId: device.id, name: device.name };
    return true;
  }
}
