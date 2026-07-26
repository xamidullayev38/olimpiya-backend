import { IsOptional, IsString, Length } from 'class-validator';

export class CreateDeviceDto {
  @IsString()
  @Length(2, 128)
  name: string;

  @IsOptional()
  @IsString()
  zoneId?: string;
}
