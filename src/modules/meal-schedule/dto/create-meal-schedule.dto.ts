import { ArrayNotEmpty, IsArray, IsDateString, IsEnum, IsString } from 'class-validator';

export enum MealTypeDto {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
}

export class CreateMealScheduleDto {
  @IsDateString()
  date: string; // YYYY-MM-DD

  @IsEnum(MealTypeDto)
  mealType: MealTypeDto;

  @IsString()
  startTime: string; // "HH:mm" formatida

  @IsString()
  endTime: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  allowedAccreditationTypeIds: string[];
}
