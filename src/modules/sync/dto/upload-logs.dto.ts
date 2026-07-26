import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsISO8601, IsOptional, IsString, ValidateNested } from 'class-validator';

class OfflineLogEntryDto {
  @IsIn(['access', 'meal'])
  type: 'access' | 'meal';

  @IsString()
  qrToken: string;

  @IsOptional()
  @IsIn(['IN', 'OUT'])
  direction?: 'IN' | 'OUT'; // faqat type=access uchun

  @IsString()
  clientEventId: string; // offline dedupe uchun MAJBURIY

  @IsISO8601()
  scannedAt: string;
}

export class UploadLogsDto {
  @IsArray()
  @ArrayMaxSize(2000) // bitta partiyada haddan tashqari katta yuk yubormaslik uchun cheklov
  @ValidateNested({ each: true })
  @Type(() => OfflineLogEntryDto)
  entries: OfflineLogEntryDto[];
}
