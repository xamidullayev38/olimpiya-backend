import { IsString, Length, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @Length(10, 128)
  // Kamida: 1 katta harf, 1 kichik harf, 1 raqam, 1 maxsus belgi
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message:
      'Parol kamida 1 ta katta harf, 1 ta kichik harf, 1 ta raqam va 1 ta maxsus belgidan iborat bo\'lishi kerak',
  })
  newPassword: string;
}
