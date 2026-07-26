import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccreditationTypeDto } from './dto/create-accreditation-type.dto';
import { UpdateAccreditationTypeDto } from './dto/update-accreditation-type.dto';
import { AccreditationTypeRepository } from './repositories/accreditation-types.repository';

@Injectable()
export class AccreditationTypesService {
  constructor(
    private accreditationTypeRepo: AccreditationTypeRepository,
    private prisma: PrismaService,
  ) {}

  findAll() {
    return this.accreditationTypeRepo.findMany();
  }

  async findOne(id: string) {
    const type = await this.accreditationTypeRepo.findById(id);
    if (!type) throw new NotFoundException('Akkreditatsiya turi topilmadi');
    return type;
  }

  async create(dto: CreateAccreditationTypeDto) {
    const existing = await this.accreditationTypeRepo.findByCode(dto.code);
    if (existing) throw new ConflictException('Shu nom yoki kod bilan tur allaqachon mavjud');
    return this.accreditationTypeRepo.create(dto);
  }

  async update(id: string, dto: UpdateAccreditationTypeDto) {
    await this.findOne(id);
    return this.accreditationTypeRepo.update(id, dto);
  }

  async setAllowedZones(id: string, zoneIds: string[]) {
    await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.zoneAccessRule.deleteMany({ where: { accreditationTypeId: id } }),
      this.prisma.zoneAccessRule.createMany({
        data: zoneIds.map((zoneId) => ({ accreditationTypeId: id, zoneId })),
      }),
    ]);
    return this.findOne(id);
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.accreditationTypeRepo.update(id, { isActive: false });
  }
}
