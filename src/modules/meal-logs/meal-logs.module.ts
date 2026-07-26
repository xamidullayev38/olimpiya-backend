import { Module } from '@nestjs/common';
import { MealLogsService } from './meal-logs.service';
import { MealLogsController } from './meal-logs.controller';
import { MealLogRepository } from './repositories/meal-logs.repository';

@Module({
  providers: [MealLogsService, MealLogRepository],
  controllers: [MealLogsController],
  exports: [MealLogsService, MealLogRepository],
})
export class MealLogsModule {}
