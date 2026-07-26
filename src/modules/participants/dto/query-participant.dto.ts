import { IsIn, IsOptional, IsString } from 'class-validator';

export class QueryParticipantDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  accreditationTypeId?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'BLOCKED', 'EXPIRED'])
  badgeStatus?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  pageSize?: string;
}
