import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { DashboardGateway } from './dashboard.gateway';
import { ZoneRepository } from '../zones/repositories/zones.repository';
import { AccessLogRepository } from '../access-logs/repositories/access-logs.repository';
import { MealLogRepository } from '../meal-logs/repositories/meal-logs.repository';
import { ParticipantsRepository } from '../participants/repositories/participants.repository';

@Module({
  imports: [JwtModule.register({})],
  providers: [
    DashboardService,
    DashboardGateway,
    ZoneRepository,
    AccessLogRepository,
    MealLogRepository,
    ParticipantsRepository,
  ],
  controllers: [DashboardController],
  exports: [DashboardService, DashboardGateway],
})
export class DashboardModule {}
