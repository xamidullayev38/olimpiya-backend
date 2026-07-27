import { IsString, Length } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @Length(6, 128, {
    message: 'Yangi parol kamida 6 ta belgidan iborat bo\'lishi kerak',
  })
  newPassword: string;
}
