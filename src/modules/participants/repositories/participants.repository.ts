import { Injectable } from '@nestjs/common';
import { Prisma, Participant, BadgeStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ParticipantsRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.ParticipantCreateInput): Promise<Participant> {
    return this.prisma.participant.create({
      data,
      include: { accreditationType: true },
    });
  }

  async findById(id: string) {
    return this.prisma.participant.findUnique({
      where: { id },
      include: { accreditationType: true },
    });
  }

  async findByIdWithZoneAccess(id: string) {
    return this.prisma.participant.findUnique({
      where: { id },
      include: { accreditationType: { include: { zoneAccess: true } } },
    });
  }

  async findMany(where: Prisma.ParticipantWhereInput, skip?: number, take?: number) {
    return this.prisma.participant.findMany({
      where,
      include: { accreditationType: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async count(where: Prisma.ParticipantWhereInput): Promise<number> {
    return this.prisma.participant.count({ where });
  }

  async update(id: string, data: Prisma.ParticipantUpdateInput) {
    return this.prisma.participant.update({
      where: { id },
      data,
      include: { accreditationType: true },
    });
  }

  async updateBadgeStatus(id: string, status: BadgeStatus) {
    return this.prisma.participant.update({
      where: { id },
      data: { badgeStatus: status },
      include: { accreditationType: true },
    });
  }

  async incrementQrTokenVersion(id: string) {
    return this.prisma.participant.update({
      where: { id },
      data: { qrTokenVersion: { increment: 1 } },
    });
  }
}
