import { IsBoolean, IsOptional, IsString, Length, IsArray } from 'class-validator';

export class CreateZoneDto {
  @IsString()
  @Length(2, 128)
  name: string;

  @IsString()
  @Length(2, 32)
  code: string;

  @IsOptional()
  @IsBoolean()
  requiresAccessControl?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedAccreditationTypeIds?: string[];
}
