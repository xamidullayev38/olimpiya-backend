import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './repositories/users.repository';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private usersRepo: UsersRepository,
    private prisma: PrismaService,
  ) {}

  async create(dto: CreateUserDto) {
    const existing = await this.usersRepo.findByUsername(dto.username);
    if (existing) throw new ConflictException('Bu username allaqachon band');

    const temporaryPassword = dto.password || this.generateTempPassword();
    const passwordHash = await argon2.hash(temporaryPassword);

    const user = await this.usersRepo.create({
      fullName: dto.fullName,
      username: dto.username,
      email: dto.email,
      passwordHash,
      mustChangePassword: true,
      roles: { create: dto.roleIds.map((roleId) => ({ roleId })) },
    });

    return { ...this.sanitize(user), temporaryPassword };
  }

  async findAll() {
    const users = await this.usersRepo.findMany();
    return users.map((u) => this.sanitize(u));
  }

  async findOne(id: string) {
    const user = await this.usersRepo.findById(id);
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    return this.sanitize(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    const user = await this.usersRepo.update(id, {
      fullName: dto.fullName,
      email: dto.email,
      isActive: dto.isActive,
      ...(dto.roleIds
        ? {
            roles: {
              deleteMany: {},
              create: dto.roleIds.map((roleId) => ({ roleId })),
            },
          }
        : {}),
    });
    return this.sanitize(user);
  }

  async resetPassword(id: string) {
    await this.findOne(id);
    const temporaryPassword = this.generateTempPassword();
    const passwordHash = await argon2.hash(temporaryPassword);
    await this.usersRepo.update(id, { passwordHash, mustChangePassword: true, failedLoginCount: 0, lockedUntil: null });
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { temporaryPassword };
  }

  async deactivate(id: string) {
    await this.findOne(id);
    await this.usersRepo.update(id, { isActive: false });
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async delete(id: string) {
    await this.findOne(id);
    try {
      return await this.usersRepo.delete(id);
    } catch (e: any) {
      if (e.code === 'P2003') {
        throw new ConflictException('Ushbu foydalanuvchiga tegishli tarixiy ma\'lumotlar mavjud bo\'lganligi sababli o\'chirib bo\'lmaydi');
      }
      throw e;
    }
  }

  private generateTempPassword(): string {
    return randomBytes(9).toString('base64').replace(/[+/=]/g, '') + '_A1!';
  }

  private sanitize(user: any) {
    const { passwordHash, failedLoginCount, lockedUntil, ...rest } = user;
    return { ...rest, roles: user.roles?.map((r: any) => r.role?.name || r.role) };
  }
}
