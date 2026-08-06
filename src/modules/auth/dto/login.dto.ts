import { IsString, Length, Matches, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(3, 64)
  username: string;

  @IsString()
  @Length(8, 128)
  password: string;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsString()
  @IsOptional()
  deviceName?: string;
}
