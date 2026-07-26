import { IsISO8601, IsOptional, IsString, Length } from 'class-validator';

export class ScanMealDto {
  @IsString()
  @Length(10, 4000)
  qrToken: string;

  @IsOptional()
  @IsString()
  clientEventId?: string;

  @IsOptional()
  @IsISO8601()
  scannedAt?: string;
}
