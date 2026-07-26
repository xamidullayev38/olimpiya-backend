import { ArrayNotEmpty, IsArray, IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Length(2, 128)
  fullName: string;

  @IsString()
  @Length(3, 64)
  @Matches(/^[a-zA-Z0-9._-]+$/, { message: 'Username faqat lotin harflar, raqam, . _ - belgilaridan iborat bo\'lishi mumkin' })
  username: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roleIds: string[];
}
