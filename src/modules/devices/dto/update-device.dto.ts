import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { DeviceStatus } from '@prisma/client';

export class UpdateDeviceDto {
  @IsOptional()
  @IsString()
  @Length(2, 128)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(4, 128)
  deviceKey?: string;

  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;
}
