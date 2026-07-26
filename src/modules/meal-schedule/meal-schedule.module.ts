import { Module } from '@nestjs/common';
import { MealScheduleService } from './meal-schedule.service';
import { MealScheduleController } from './meal-schedule.controller';
import { MealScheduleRepository } from './repositories/meal-schedule.repository';

@Module({
  providers: [MealScheduleService, MealScheduleRepository],
  controllers: [MealScheduleController],
  exports: [MealScheduleService, MealScheduleRepository],
})
export class MealScheduleModule {}
