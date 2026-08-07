import { Injectable } from '@nestjs/common';
import { Prisma, MealLog, ScanResultStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class MealLogRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.MealLogCreateInput): Promise<MealLog> {
    return this.prisma.mealLog.create({
      data,
      include: { mealSchedule: true, participant: { include: { accreditationType: true } }, device: { select: { name: true } } },
    });
  }

  async findByClientEventId(clientEventId: string) {
    return this.prisma.mealLog.findUnique({
      where: { clientEventId },
      include: { mealSchedule: true, participant: { include: { accreditationType: true } }, device: { select: { name: true } } },
    });
  }

  async findFirstGranted(participantId: string, mealScheduleId: string) {
    return this.prisma.mealLog.findFirst({
      where: { participantId, mealScheduleId, result: ScanResultStatus.GRANTED },
      orderBy: { scannedAt: 'asc' },
    });
  }

  async findMany(where: Prisma.MealLogWhereInput, skip?: number, take?: number) {
    return this.prisma.mealLog.findMany({
      where,
      include: { mealSchedule: true, participant: { include: { accreditationType: true } }, device: { select: { name: true } } },
      orderBy: { scannedAt: 'desc' },
      skip,
      take,
    });
  }

  async count(where: Prisma.MealLogWhereInput): Promise<number> {
    return this.prisma.mealLog.count({ where });
  }

  async findRecentByDevice(deviceId: string, limit: number = 10) {
    return this.prisma.mealLog.findMany({
      where: { deviceId },
      include: { mealSchedule: true, participant: { include: { accreditationType: true } }, device: { select: { name: true } } },
      orderBy: { scannedAt: 'desc' },
      take: limit,
    });
  }

  async deleteMany(ids: string[]): Promise<Prisma.BatchPayload> {
    return this.prisma.mealLog.deleteMany({
      where: { id: { in: ids } },
    });
  }
}
