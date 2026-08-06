import { Injectable } from '@nestjs/common';
import { Prisma, AccessLog } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AccessLogRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.AccessLogCreateInput): Promise<AccessLog> {
    return this.prisma.accessLog.create({
      data,
      include: { zone: true, participant: { include: { accreditationType: true } } },
    });
  }

  async findByClientEventId(clientEventId: string) {
    return this.prisma.accessLog.findUnique({
      where: { clientEventId },
      include: { zone: true, participant: { include: { accreditationType: true } } },
    });
  }

  async findMany(where: Prisma.AccessLogWhereInput, skip?: number, take?: number) {
    return this.prisma.accessLog.findMany({
      where,
      include: { zone: true, participant: { include: { accreditationType: true } } },
      orderBy: { scannedAt: 'desc' },
      skip,
      take,
    });
  }

  async count(where: Prisma.AccessLogWhereInput): Promise<number> {
    return this.prisma.accessLog.count({ where });
  }

  async findRecentByDevice(deviceId: string, limit: number = 10) {
    return this.prisma.accessLog.findMany({
      where: { deviceId },
      include: { zone: true, participant: { include: { accreditationType: true } } },
      orderBy: { scannedAt: 'desc' },
      take: limit,
    });
  }

  async findLastGranted(participantId: string) {
    return this.prisma.accessLog.findFirst({
      where: { participantId, result: 'GRANTED' },
      orderBy: { scannedAt: 'desc' },
    });
  }
}
