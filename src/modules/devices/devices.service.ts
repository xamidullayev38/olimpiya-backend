import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { CreateDeviceDto } from './dto/create-device.dto';
import { DeviceLoginDto } from './dto/device-login.dto';
import { DeviceStatus } from '@prisma/client';
import { DeviceRepository } from './repositories/devices.repository';
import { ZoneRepository } from '../zones/repositories/zones.repository';

@Injectable()
export class DevicesService {
  constructor(
    private deviceRepo: DeviceRepository,
    private zoneRepo: ZoneRepository,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  findAll() {
    return this.deviceRepo.findMany();
  }

  /**
   * Admin tomonidan yangi skaner qurilma ro'yxatga olinadi.
   * Xom deviceKey FAQAT shu javobda bir marta qaytariladi (yoki admin kiritgani ishlatiladi)
   */
  async create(dto: CreateDeviceDto) {
    const rawKey = dto.deviceKey || randomBytes(24).toString('base64url');
    const deviceKeyHash = await argon2.hash(rawKey);

    const device = await this.deviceRepo.create({
      name: dto.name,
      deviceKeyHash,
      currentZone: dto.zoneId ? { connect: { id: dto.zoneId } } : undefined,
    });

    return { deviceId: device.id, name: device.name, deviceKey: rawKey };
  }

  async update(id: string, dto: import('./dto/update-device.dto').UpdateDeviceDto) {
    const device = await this.deviceRepo.findById(id);
    if (!device) throw new NotFoundException('Qurilma topilmadi');

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.deviceKey !== undefined && dto.deviceKey.trim() !== "") {
      updateData.deviceKeyHash = await argon2.hash(dto.deviceKey);
    }

    return this.deviceRepo.update(id, updateData);
  }

  async revoke(id: string) {
    const device = await this.deviceRepo.findById(id);
    if (!device) throw new NotFoundException('Qurilma topilmadi');
    return this.deviceRepo.update(id, { status: DeviceStatus.REVOKED });
  }

  async delete(id: string) {
    const device = await this.deviceRepo.findById(id);
    if (!device) throw new NotFoundException('Qurilma topilmadi');
    return this.deviceRepo.delete(id);
  }

  /**
   * FT-19: Mobil ilova login. deviceId + deviceKey orqali autentifikatsiya, natijada
   * qisqa muddatli device-token qaytariladi (staff JWT'dan mustaqil kanal).
   */
  async login(dto: DeviceLoginDto) {
    const device = await this.deviceRepo.findById(dto.deviceId);
    if (!device || device.status !== DeviceStatus.ACTIVE) {
      throw new UnauthorizedException('Qurilma topilmadi yoki bloklangan');
    }

    const valid = await argon2.verify(device.deviceKeyHash, dto.deviceKey);
    if (!valid) throw new UnauthorizedException('Qurilma kaliti noto\'g\'ri');

    const token = await this.jwtService.signAsync(
      { sub: device.id },
      {
        secret: this.config.get<string>('DEVICE_TOKEN_SECRET'),
        expiresIn: this.config.get<string>('DEVICE_TOKEN_EXPIRES_IN') || '365d',
      },
    );

    return { deviceToken: token, deviceId: device.id, name: device.name, currentZoneId: device.currentZoneId };
  }

  // FT-17: qurilmani istalgan binoga/zonaga biriktirish - shu zonaga mas'ul inson ilovada tanlaydi
  async selectZone(deviceId: string, zoneId: string) {
    const zone = await this.zoneRepo.findById(zoneId);
    if (!zone) throw new NotFoundException('Zona topilmadi');
    return this.deviceRepo.update(deviceId, { currentZone: { connect: { id: zoneId } } });
  }
}
