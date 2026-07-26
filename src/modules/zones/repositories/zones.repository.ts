import { Injectable } from '@nestjs/common';
import { Prisma, Zone } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ZoneRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.zone.findUnique({
      where: { id },
      include: { accessRules: { include: { accreditationType: true } } },
    });
  }

  async findByCode(code: string) {
    return this.prisma.zone.findUnique({ where: { code } });
  }

  async findMany(where?: Prisma.ZoneWhereInput) {
    return this.prisma.zone.findMany({
      where,
      include: { accessRules: { include: { accreditationType: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(data: Prisma.ZoneCreateInput): Promise<Zone> {
    return this.prisma.zone.create({ data });
  }

  async update(id: string, data: Prisma.ZoneUpdateInput): Promise<Zone> {
    return this.prisma.zone.update({ where: { id }, data });
  }

  async delete(id: string): Promise<Zone> {
    return this.prisma.zone.delete({ where: { id } });
  }
}
