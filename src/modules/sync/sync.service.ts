import { Injectable } from '@nestjs/common';
import { ScanService } from '../scan/scan.service';
import { UploadLogsDto } from './dto/upload-logs.dto';
import { DeviceRepository } from '../devices/repositories/devices.repository';
import { ParticipantsRepository } from '../participants/repositories/participants.repository';
import { AccreditationTypeRepository } from '../accreditation-types/repositories/accreditation-types.repository';
import { MealScheduleRepository } from '../meal-schedule/repositories/meal-schedule.repository';
import { MealLogRepository } from '../meal-logs/repositories/meal-logs.repository';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SyncService {
  constructor(
    private deviceRepo: DeviceRepository,
    private participantsRepo: ParticipantsRepository,
    private accreditationTypeRepo: AccreditationTypeRepository,
    private mealScheduleRepo: MealScheduleRepository,
    private mealLogRepo: MealLogRepository,
    private scanService: ScanService,
    private prisma: PrismaService,
  ) {}

  /**
   * FT-16: Mobil ilova offline rejimda ishlashi uchun kerak bo'ladigan minimal ma'lumotlar
   * paketi. Faqat ID/status darajasidagi ma'lumot beriladi - shaxsiy ma'lumotlar (PINFL va h.k.)
   * qurilmaga hech qachon yuborilmaydi (NFT-4 talabiga muvofiq).
   */
  async getOfflinePackage(deviceId: string) {
    const device = await this.deviceRepo.findById(deviceId);

    const [participants, accreditationTypes, zoneAccessRules, todaySchedules] = await Promise.all([
      this.participantsRepo.findMany({}),
      this.accreditationTypeRepo.findMany({}),
      this.prisma.zoneAccessRule.findMany({
        select: { zoneId: true, accreditationTypeId: true },
      }),
      this.mealScheduleRepo.findMany({ date: this.todayDateOnly(), isActive: true }),
    ]);

    const todayMealLogs = await this.mealLogRepo.findMany({
      result: 'GRANTED',
      mealScheduleId: { in: todaySchedules.map((s) => s.id) },
    });

    return {
      generatedAt: new Date(),
      currentZoneId: (device?.assignedToUser?.assignedZoneId || device?.currentZoneId) ?? null,
      participants: participants.map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        badgeStatus: p.badgeStatus,
        qrTokenId: p.qrTokenId,
        qrTokenVersion: p.qrTokenVersion,
        accreditationTypeId: p.accreditationTypeId,
      })),
      accreditationTypes: accreditationTypes.map((a) => ({
        id: a.id,
        name: a.name,
        code: a.code,
        mealAllowed: a.mealAllowed,
        isActive: a.isActive,
      })),
      zoneAccessRules,
      mealSchedules: todaySchedules.map((s) => ({
        id: s.id,
        mealType: s.mealType,
        startTime: s.startTime,
        endTime: s.endTime,
        allowedAccreditationTypeIds: s.allowedTypes.map((a) => a.accreditationTypeId),
      })),
      todayMealLogs: todayMealLogs.map((l) => ({
        participantId: l.participantId,
        mealScheduleId: l.mealScheduleId,
        scannedAt: l.scannedAt,
      })),
    };
  }

  /**
   * FT-16: internet tiklanganda mobil ilova offline yig'ilgan loglarni shu endpoint orqali yuboradi.
   * Har bir yozuv qayta ScanService orqali serverda TO'LIQ tekshiriladi.
   * clientEventId orqali idempotent - takror yuborilsa dublikat yaratilmaydi.
   */
  async uploadLogs(dto: UploadLogsDto, deviceId: string) {
    const results: { clientEventId: string; status: string; detail?: any }[] = [];

    for (const entry of dto.entries) {
      try {
        if (entry.type === 'access') {
          const result = await this.scanService.scanAccess(
            {
              qrToken: entry.qrToken,
              direction: entry.direction as any,
              clientEventId: entry.clientEventId,
              scannedAt: entry.scannedAt,
            },
            { deviceId },
          );
          results.push({ clientEventId: entry.clientEventId, status: 'processed', detail: result });
        } else {
          const result = await this.scanService.scanMeal(
            {
              qrToken: entry.qrToken,
              clientEventId: entry.clientEventId,
              scannedAt: entry.scannedAt,
            },
            { deviceId },
          );
          results.push({ clientEventId: entry.clientEventId, status: 'processed', detail: result });
        }
      } catch (e: any) {
        results.push({ clientEventId: entry.clientEventId, status: 'error', detail: e.message });
      }
    }

    return { processedCount: results.length, results };
  }

  private todayDateOnly(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}
