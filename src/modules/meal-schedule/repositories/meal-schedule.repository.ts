import { Injectable } from '@nestjs/common';
import { Prisma, MealSchedule } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class MealScheduleRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.mealSchedule.findUnique({
      where: { id },
      include: { allowedTypes: { include: { accreditationType: true } } },
    });
  }

  async findActiveScheduleForNow(dateOnly: Date, scannedAt: Date) {
    return this.prisma.mealSchedule.findFirst({
      where: {
        date: dateOnly,
        isActive: true,
        startTime: { lte: scannedAt },
        endTime: { gte: scannedAt },
      },
      include: { allowedTypes: { include: { accreditationType: true } } },
    });
  }

  async findNearestMissed(dateOnly: Date, scannedAt: Date) {
    return this.prisma.mealSchedule.findFirst({
      where: { date: dateOnly, endTime: { lt: scannedAt } },
      orderBy: { endTime: 'desc' },
    });
  }

  async isAccreditationAllowed(mealScheduleId: string, accreditationTypeId: string) {
    const record = await this.prisma.mealScheduleAccreditation.findUnique({
      where: {
        mealScheduleId_accreditationTypeId: {
          mealScheduleId,
          accreditationTypeId,
        },
      },
    });
    return !!record;
  }

  async findMany(where?: Prisma.MealScheduleWhereInput) {
    return this.prisma.mealSchedule.findMany({
      where,
      include: { allowedTypes: { include: { accreditationType: true } } },
      orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
    });
  }

  async create(data: Prisma.MealScheduleCreateInput): Promise<MealSchedule> {
    return this.prisma.mealSchedule.create({ data });
  }
}
