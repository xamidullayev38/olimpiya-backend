import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedDevice {
  deviceId: string;
  name: string;
}

// Mobil skaner qurilma autentifikatsiyasidan keyin request'ga biriktiriladi
export const CurrentDevice = createParamDecorator(
  (data: keyof AuthenticatedDevice | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const device = request.device as AuthenticatedDevice;
    return data ? device?.[data] : device;
  },
);
