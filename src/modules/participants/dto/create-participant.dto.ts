import { IsDateString, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateParticipantDto {
  @IsString()
  @Length(1, 64)
  firstName: string;

  @IsString()
  @Length(1, 64)
  lastName: string;

  @IsOptional()
  @IsString()
  @Length(0, 64)
  middleName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{14}$/, { message: 'PINFL 14 ta raqamdan iborat bo\'lishi kerak' })
  pinfl?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?\d{7,15}$/, { message: 'Telefon raqam formati noto\'g\'ri' })
  phone?: string;

  @IsOptional()
  @IsString()
  organization?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  sportType?: string;

  @IsString()
  accreditationTypeId: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
