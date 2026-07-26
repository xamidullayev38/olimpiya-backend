import { IsEnum, IsISO8601, IsOptional, IsString, Length } from 'class-validator';

export enum DirectionDto {
  IN = 'IN',
  OUT = 'OUT',
}

export class ScanAccessDto {
  @IsString()
  @Length(10, 4000)
  qrToken: string;

  @IsEnum(DirectionDto)
  direction: DirectionDto;

  // Mobil qurilma tomonidan generatsiya qilinadigan unikal ID - offline sync paytida dublikatni oldini oladi
  @IsOptional()
  @IsString()
  clientEventId?: string;

  // Offline holatda yozilgan bo'lsa - haqiqiy skan vaqti
  @IsOptional()
  @IsISO8601()
  scannedAt?: string;
}
