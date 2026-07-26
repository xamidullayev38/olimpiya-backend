import { SetMetadata } from '@nestjs/common';

// Ayrim endpointlarni (masalan /auth/login) global JWT guarddan chetlab o'tish uchun
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
