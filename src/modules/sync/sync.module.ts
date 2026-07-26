import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { ScanModule } from '../scan/scan.module';
import { DeviceRepository } from '../devices/repositories/devices.repository';
import { ParticipantsRepository } from '../participants/repositories/participants.repository';
import { AccreditationTypeRepository } from '../accreditation-types/repositories/accreditation-types.repository';
import { MealScheduleRepository } from '../meal-schedule/repositories/meal-schedule.repository';
import { MealLogRepository } from '../meal-logs/repositories/meal-logs.repository';

@Module({
  imports: [JwtModule.register({}), ScanModule],
  providers: [
    SyncService,
    DeviceRepository,
    ParticipantsRepository,
    AccreditationTypeRepository,
    MealScheduleRepository,
    MealLogRepository,
  ],
  controllers: [SyncController],
})
export class SyncModule {}
