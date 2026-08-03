import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UsersRepository } from '../users/repositories/users.repository';

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersRepo: UsersRepository,
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async login(dto: LoginDto, meta: RequestMeta) {
    const user = await this.usersRepo.findByUsername(dto.username);
    const genericError = 'Login yoki parol noto\'g\'ri';

    if (!user) {
      await argon2.hash('dummy-password-for-timing-safety');
      throw new UnauthorizedException(genericError);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new ForbiddenException(
        `Hisob vaqtincha bloklangan. ${minutesLeft} daqiqadan so'ng qayta urinib ko'ring`,
      );
    }

    if (!user.isActive) {
      throw new ForbiddenException('Hisob faol emas. Administrator bilan bog\'laning');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);

    if (!passwordValid) {
      await this.registerFailedAttempt(user.id, user.failedLoginCount);
      throw new UnauthorizedException(genericError);
    }

    await this.usersRepo.update(user.id, { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() });

    const roles = (user.roles || []).map((r) => r.role?.name).filter((name): name is string => Boolean(name));
    const permissions = Array.from(
      new Set(
        (user.roles || []).flatMap((ur) =>
          (ur.role?.permissions || [])
            .map((rp) => rp.permission?.code)
            .filter((code): code is string => Boolean(code)),
        ),
      ),
    );

    const tokens = await this.issueTokens(user.id, user.username, roles, permissions, meta);

    return {
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        roles,
        mustChangePassword: user.mustChangePassword,
        assignedZone: user.assignedZone ? { id: user.assignedZone.id, name: user.assignedZone.name, code: user.assignedZone.code } : null,
      },
    };
  }

  private async registerFailedAttempt(userId: string, currentCount: number) {
    const maxAttempts = this.config.get<number>('LOGIN_MAX_ATTEMPTS') || 5;
    const lockoutMinutes = this.config.get<number>('LOGIN_LOCKOUT_MINUTES') || 15;
    const newCount = currentCount + 1;

    await this.usersRepo.update(userId, {
      failedLoginCount: newCount,
      lockedUntil:
        newCount >= maxAttempts
          ? new Date(Date.now() + lockoutMinutes * 60 * 1000)
          : undefined,
    });
  }

  private async issueTokens(
    userId: string,
    username: string,
    roles: string[],
    permissions: string[],
    meta: RequestMeta,
  ) {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, username, roles, permissions },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m',
      },
    );

    const refreshTokenRaw = randomBytes(48).toString('hex');
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    const expiresAt = this.addDuration(new Date(), refreshExpiresIn);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshTokenRaw),
        expiresAt,
        createdByIp: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    return { accessToken, refreshToken: refreshTokenRaw };
  }

  async refresh(rawToken: string, meta: RequestMeta) {
    const tokenHash = this.hashToken(rawToken);
    const existing = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: {
        user: {
          include: {
            roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
          },
        },
      },
    });

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      if (existing?.revokedAt) {
        await this.revokeAllUserTokens(existing.userId);
      }
      throw new UnauthorizedException('Refresh token yaroqsiz. Qayta login qiling');
    }

    if (!existing.user.isActive) {
      throw new ForbiddenException('Hisob faol emas');
    }

    const roles = (existing.user.roles || []).map((r) => r.role?.name).filter((name): name is string => Boolean(name));
    const permissions = Array.from(
      new Set(
        (existing.user.roles || []).flatMap((ur) =>
          (ur.role?.permissions || [])
            .map((rp) => rp.permission?.code)
            .filter((code): code is string => Boolean(code)),
        ),
      ),
    );

    const tokens = await this.issueTokens(
      existing.user.id,
      existing.user.username,
      roles,
      permissions,
      meta,
    );

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedBy: this.hashToken(tokens.refreshToken) },
    });

    return tokens;
  }

  async logout(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  private async revokeAllUserTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersRepo.findById(userId);
    if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi');

    const valid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!valid) {
      throw new UnauthorizedException('Joriy parol noto\'g\'ri');
    }

    const newHash = await argon2.hash(dto.newPassword);
    await this.usersRepo.update(userId, {
      passwordHash: newHash,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    });

    await this.revokeAllUserTokens(userId);

    const roles = (user.roles || []).map((r) => r.role?.name).filter((name): name is string => Boolean(name));
    const permissions = Array.from(
      new Set(
        (user.roles || []).flatMap((ur) =>
          (ur.role?.permissions || [])
            .map((rp) => rp.permission?.code)
            .filter((code): code is string => Boolean(code)),
        ),
      ),
    );

    const tokens = await this.issueTokens(user.id, user.username, roles, permissions, {});

    return {
      success: true,
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        roles,
        permissions,
        mustChangePassword: false,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.usersRepo.findById(userId);
    if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi');

    const roles = (user.roles || []).map((r) => r.role?.name).filter((name): name is string => Boolean(name));
    const permissions = Array.from(
      new Set(
        (user.roles || []).flatMap((ur) =>
          (ur.role?.permissions || [])
            .map((rp) => rp.permission?.code)
            .filter((code): code is string => Boolean(code)),
        ),
      ),
    );

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      roles,
      permissions,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
      assignedZone: user.assignedZone ? { id: user.assignedZone.id, name: user.assignedZone.name, code: user.assignedZone.code } : null,
      createdAt: user.createdAt,
    };
  }

  private addDuration(date: Date, duration: string): Date {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return new Date(date.getTime() + value * multipliers[unit]);
  }
}
