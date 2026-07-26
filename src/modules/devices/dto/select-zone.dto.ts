import { IsString } from 'class-validator';

export class SelectZoneDto {
  @IsString()
  zoneId: string;
}
