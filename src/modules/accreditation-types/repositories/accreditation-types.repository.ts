import { Injectable } from '@nestjs/common';
import { Prisma, AccreditationType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AccreditationTypeRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.accreditationType.findUnique({
      where: { id },
      include: { zoneAccess: { include: { zone: true } } },
    });
  }

  async findByCode(code: string) {
    return this.prisma.accreditationType.findUnique({ where: { code } });
  }

  async findMany(where?: Prisma.AccreditationTypeWhereInput) {
    return this.prisma.accreditationType.findMany({
      where,
      include: { zoneAccess: { include: { zone: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(data: Prisma.AccreditationTypeCreateInput): Promise<AccreditationType> {
    return this.prisma.accreditationType.create({ data });
  }

  async update(id: string, data: Prisma.AccreditationTypeUpdateInput): Promise<AccreditationType> {
    return this.prisma.accreditationType.update({ where: { id }, data });
  }
}
