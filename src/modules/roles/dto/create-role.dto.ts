import { IsOptional, IsString, Length } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @Length(2, 64)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
