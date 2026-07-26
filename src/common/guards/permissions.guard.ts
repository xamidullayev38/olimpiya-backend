import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

/**
 * RBAC: foydalanuvchining barcha rollaridan yig'ilgan permission ro'yxati
 * bilan endpoint talab qiladigan permissionlarni solishtiradi.
 * SUPER_ADMIN roli har doim to'liq huquqqa ega (Role hierarchy & universal override).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new ForbiddenException('Autentifikatsiya talab qilinadi');
    }

    // Role Hierarchy Override: SUPER_ADMIN har doim barcha huquqlarga ega
    if (user.roles?.some((r) => r.toUpperCase() === 'SUPER_ADMIN' || r === 'Super Admin')) {
      return true;
    }

    const hasAll = required.every((perm) => user.permissions?.includes(perm));
    if (!hasAll) {
      throw new ForbiddenException(
        `Ushbu amal uchun huquq yetarli emas: ${required.join(', ')}`,
      );
    }
    return true;
  }
}
