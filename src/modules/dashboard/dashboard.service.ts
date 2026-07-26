import { Injectable } from '@nestjs/common';
import { ZoneRepository } from '../zones/repositories/zones.repository';
import { AccessLogRepository } from '../access-logs/repositories/access-logs.repository';
import { MealLogRepository } from '../meal-logs/repositories/meal-logs.repository';
import { ParticipantsRepository } from '../participants/repositories/participants.repository';

@Injectable()
export class DashboardService {
  constructor(
    private zoneRepo: ZoneRepository,
    private accessLogRepo: AccessLogRepository,
    private mealLogRepo: MealLogRepository,
    private participantsRepo: ParticipantsRepository,
  ) {}

  // FT-21: har bir zonada hozirgi odamlar soni (kirish-chiqish farqi)
  async getLiveStats() {
    const zones = await this.zoneRepo.findMany({ isActive: true });

    const occupancy = await Promise.all(
      zones.map(async (zone) => {
        const [inCount, outCount] = await Promise.all([
          this.accessLogRepo.count({ zoneId: zone.id, direction: 'IN', result: 'GRANTED' }),
          this.accessLogRepo.count({ zoneId: zone.id, direction: 'OUT', result: 'GRANTED' }),
        ]);
        return {
          zoneId: zone.id,
          zoneName: zone.name,
          zoneCode: zone.code,
          currentOccupancy: Math.max(inCount - outCount, 0),
        };
      }),
    );

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [totalParticipants, totalScansToday, deniedToday, mealsServedToday] = await Promise.all([
      this.participantsRepo.count({ badgeStatus: 'ACTIVE' }),
      this.accessLogRepo.count({ scannedAt: { gte: todayStart } }),
      this.accessLogRepo.count({ scannedAt: { gte: todayStart }, result: 'DENIED' }),
      this.mealLogRepo.count({ scannedAt: { gte: todayStart }, result: 'GRANTED' }),
    ]);

    return {
      generatedAt: new Date(),
      totalParticipants,
      totalScansToday,
      deniedToday,
      mealsServedToday,
      zoneOccupancy: occupancy,
    };
  }
}
