import { Injectable } from '@nestjs/common';
import { Prisma, Device } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DeviceRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.device.findUnique({
      where: { id },
      include: { currentZone: true },
    });
  }

  async findByDeviceKeyHash(deviceKeyHash: string) {
    return this.prisma.device.findUnique({
      where: { deviceKeyHash },
      include: { currentZone: true },
    });
  }

  async update(id: string, data: Prisma.DeviceUpdateInput) {
    return this.prisma.device.update({
      where: { id },
      data,
      include: { currentZone: true },
    });
  }

  async create(data: Prisma.DeviceCreateInput): Promise<Device> {
    return this.prisma.device.create({ data });
  }

  async findMany(where?: Prisma.DeviceWhereInput) {
    return this.prisma.device.findMany({
      where,
      include: { currentZone: true, assignedToUser: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(id: string): Promise<Device> {
    return this.prisma.device.delete({ where: { id } });
  }
}
