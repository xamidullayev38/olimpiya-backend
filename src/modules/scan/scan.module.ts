import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ScanService } from './scan.service';
import { ScanController } from './scan.controller';
import { BadgesModule } from '../badges/badges.module';
import { MealScheduleModule } from '../meal-schedule/meal-schedule.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { AccessLogRepository } from '../access-logs/repositories/access-logs.repository';
import { MealLogRepository } from '../meal-logs/repositories/meal-logs.repository';
import { DeviceRepository } from '../devices/repositories/devices.repository';
import { ParticipantsRepository } from '../participants/repositories/participants.repository';
import { MealScheduleRepository } from '../meal-schedule/repositories/meal-schedule.repository';

@Module({
  imports: [JwtModule.register({}), BadgesModule, MealScheduleModule, DashboardModule],
  providers: [
    ScanService,
    AccessLogRepository,
    MealLogRepository,
    DeviceRepository,
    ParticipantsRepository,
    MealScheduleRepository,
  ],
  controllers: [ScanController],
  exports: [ScanService],
})
export class ScanModule {}
