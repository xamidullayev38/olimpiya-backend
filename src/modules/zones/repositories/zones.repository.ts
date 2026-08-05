import { Injectable } from '@nestjs/common';
import { Prisma, Zone } from '@prisma/client';
import { CreateZoneDto } from '../dto/create-zone.dto';
import { UpdateZoneDto } from '../dto/update-zone.dto';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ZoneRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.zone.findUnique({
      where: { id },
      include: {
        accessRules: { include: { accreditationType: true } },
        devices: true,
      },
    });
  }

  async findByCode(code: string) {
    return this.prisma.zone.findUnique({ where: { code } });
  }

  async hasAccessRules(zoneId: string): Promise<boolean> {
    const count = await this.prisma.zoneAccessRule.count({ where: { zoneId } });
    return count > 0;
  }

  async findMany(where?: Prisma.ZoneWhereInput) {
    return this.prisma.zone.findMany({
      where,
      include: {
        accessRules: { include: { accreditationType: true } },
        devices: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(data: CreateZoneDto): Promise<Zone> {
    const { allowedAccreditationTypeIds, ...zoneData } = data;
    return this.prisma.zone.create({ 
      data: {
        ...zoneData,
        accessRules: allowedAccreditationTypeIds?.length ? {
          create: allowedAccreditationTypeIds.map(id => ({ accreditationTypeId: id }))
        } : undefined
      },
      include: { accessRules: { include: { accreditationType: true } } }
    });
  }

  async update(id: string, data: UpdateZoneDto): Promise<Zone> {
    const { allowedAccreditationTypeIds, ...zoneData } = data;
    
    if (allowedAccreditationTypeIds !== undefined) {
      return this.prisma.$transaction(async (tx) => {
        await tx.zoneAccessRule.deleteMany({ where: { zoneId: id } });
        return tx.zone.update({
          where: { id },
          data: {
            ...zoneData,
            accessRules: {
              create: allowedAccreditationTypeIds.map(accId => ({ accreditationTypeId: accId }))
            }
          },
          include: { accessRules: { include: { accreditationType: true } } }
        });
      });
    }

    return this.prisma.zone.update({ 
      where: { id }, 
      data: zoneData as any,
      include: { accessRules: { include: { accreditationType: true } } }
    });
  }

  async delete(id: string): Promise<Zone> {
    return this.prisma.zone.delete({ where: { id } });
  }
}
