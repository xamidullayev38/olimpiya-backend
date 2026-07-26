import { IsBoolean, IsHexColor, IsOptional, IsString, Length } from 'class-validator';

export class CreateAccreditationTypeDto {
  @IsString()
  @Length(2, 64)
  name: string;

  @IsString()
  @Length(2, 32)
  code: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsBoolean()
  mealAllowed?: boolean;
}
