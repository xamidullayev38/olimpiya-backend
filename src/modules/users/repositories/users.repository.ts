import { Injectable } from '@nestjs/common';
import { Prisma, SystemUser } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.systemUser.findUnique({
      where: { id },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        assignedZone: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.systemUser.findUnique({
      where: { username },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        assignedZone: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async findMany(where?: Prisma.SystemUserWhereInput, skip?: number, take?: number) {
    return this.prisma.systemUser.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        assignedZoneId: true,
        assignedZone: { select: { id: true, name: true, code: true } },
        createdAt: true,
        roles: { select: { role: { select: { id: true, name: true, description: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async count(where?: Prisma.SystemUserWhereInput): Promise<number> {
    return this.prisma.systemUser.count({ where });
  }

  async create(data: Prisma.SystemUserCreateInput): Promise<SystemUser> {
    return this.prisma.systemUser.create({ data });
  }

  async update(id: string, data: Prisma.SystemUserUpdateInput): Promise<SystemUser> {
    return this.prisma.systemUser.update({ where: { id }, data });
  }

  async setRoles(userId: string, roleIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } });
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId, roleId })),
      });
    });
  }

  async delete(id: string) {
    return this.prisma.systemUser.delete({ where: { id } });
  }
}
