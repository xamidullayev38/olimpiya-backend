import { IsString } from 'class-validator';

export class DeviceLoginDto {
  @IsString()
  deviceId: string;

  @IsString()
  deviceKey: string;
}
