import { SetMetadata } from '@nestjs/common';

// Controller/method uchun talab qilinadigan permission kodlari (RBAC)
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
