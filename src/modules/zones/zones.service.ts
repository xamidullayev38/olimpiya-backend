import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { ZoneRepository } from './repositories/zones.repository';
import { AccessLogRepository } from '../access-logs/repositories/access-logs.repository';

@Injectable()
export class ZonesService {
  constructor(
    private zoneRepo: ZoneRepository,
    private accessLogRepo: AccessLogRepository,
  ) {}

  findAll() {
    return this.zoneRepo.findMany();
  }

  async findOne(id: string) {
    const zone = await this.zoneRepo.findById(id);
    if (!zone) throw new NotFoundException('Zona topilmadi');
    return zone;
  }

  async create(dto: CreateZoneDto) {
    const existing = await this.zoneRepo.findByCode(dto.code);
    if (existing) throw new ConflictException('Bu kod bilan zona allaqachon mavjud');
    return this.zoneRepo.create(dto);
  }

  async update(id: string, dto: UpdateZoneDto) {
    await this.findOne(id);
    return this.zoneRepo.update(id, dto);
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.zoneRepo.update(id, { isActive: false });
  }

  // Zonadagi joriy odamlar sonini hisoblash (kirish - chiqish) - FT-21
  async getCurrentOccupancy(zoneId: string) {
    await this.findOne(zoneId);
    const [inCount, outCount] = await Promise.all([
      this.accessLogRepo.count({ zoneId, direction: 'IN', result: 'GRANTED' }),
      this.accessLogRepo.count({ zoneId, direction: 'OUT', result: 'GRANTED' }),
    ]);
    return { zoneId, currentOccupancy: Math.max(inCount - outCount, 0), totalIn: inCount, totalOut: outCount };
  }
}
