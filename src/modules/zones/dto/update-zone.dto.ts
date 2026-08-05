import { PartialType } from '@nestjs/mapped-types';
import { CreateZoneDto } from './create-zone.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateZoneDto extends PartialType(CreateZoneDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
