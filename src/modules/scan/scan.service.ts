import { Injectable } from '@nestjs/common';
import { Prisma, ScanResultStatus, BadgeStatus, Direction } from '@prisma/client';
import { QrTokenService } from '../badges/qr-token.service';
import { MealScheduleService } from '../meal-schedule/meal-schedule.service';
import { ScanAccessDto } from './dto/scan-access.dto';
import { ScanMealDto } from './dto/scan-meal.dto';
import { AccessLogRepository } from '../access-logs/repositories/access-logs.repository';
import { MealLogRepository } from '../meal-logs/repositories/meal-logs.repository';
import { DeviceRepository } from '../devices/repositories/devices.repository';
import { ParticipantsRepository } from '../participants/repositories/participants.repository';
import { MealScheduleRepository } from '../meal-schedule/repositories/meal-schedule.repository';
import { ZoneRepository } from '../zones/repositories/zones.repository';
import { DashboardGateway } from '../dashboard/dashboard.gateway';

interface ScanContext {
  deviceId: string;
}

@Injectable()
export class ScanService {
  constructor(
    private accessLogRepo: AccessLogRepository,
    private mealLogRepo: MealLogRepository,
    private deviceRepo: DeviceRepository,
    private participantsRepo: ParticipantsRepository,
    private mealScheduleRepo: MealScheduleRepository,
    private qrTokenService: QrTokenService,
    private mealScheduleService: MealScheduleService,
    private dashboardGateway: DashboardGateway,
    private zoneRepo: ZoneRepository,
  ) {}

  // ------------------------------------------------------------------
  // ZONA KIRISH-CHIQISH NAZORATI (FT-6 .. FT-10)
  // ------------------------------------------------------------------
  async scanAccess(dto: ScanAccessDto, ctx: ScanContext) {
    const scannedAt = dto.scannedAt ? new Date(dto.scannedAt) : new Date();

    // Offline sinxronizatsiyada bir xil clientEventId qayta yuborilishi mumkin - dublikatni qaytaramiz
    if (dto.clientEventId) {
      const existing = await this.accessLogRepo.findByClientEventId(dto.clientEventId);
      if (existing) return this.toAccessResponse(existing, true);
    }

    const device = await this.deviceRepo.findById(ctx.deviceId);
    if (!device || !device.currentZoneId) {
      return this.denyAccessWithoutParticipant(
        null,
        device?.currentZoneId ?? null,
        dto,
        ctx,
        scannedAt,
        'Qurilma hech qanday zonaga biriktirilmagan',
      );
    }

    let participantId: string | null = null;
    try {
      const payload = await this.qrTokenService.verify(dto.qrToken);
      participantId = payload.pid;

      const participant = await this.participantsRepo.findByIdWithZoneAccess(participantId);

      if (!participant || participant.qrTokenId !== payload.tid || participant.qrTokenVersion !== payload.v) {
        return this.denyAccessWithoutParticipant(
          participantId,
          device.currentZoneId,
          dto,
          ctx,
          scannedAt,
          'QR kod eskirgan yoki bekor qilingan (badge qayta chop etilgan)',
        );
      }

      if (participant.badgeStatus !== BadgeStatus.ACTIVE) {
        return this.persistAccessLog(participant.id, device.currentZoneId, dto, ctx, scannedAt, false,
          participant.badgeStatus === BadgeStatus.BLOCKED ? 'Badge bloklangan' : 'Badge muddati tugagan');
      }

      const zoneHasRules = await this.zoneRepo.hasAccessRules(device.currentZoneId);
      const allowed = !zoneHasRules || participant.accreditationType.zoneAccess.some((z) => z.zoneId === device.currentZoneId);

      if (!allowed) {
        return this.persistAccessLog(participant.id, device.currentZoneId, dto, ctx, scannedAt, false, 'Bu zonaga ruxsat yo\'q');
      }

      // Ruxsat berildi
      return this.persistAccessLog(participant.id, device.currentZoneId, dto, ctx, scannedAt, true, null);
    } catch {
      return this.denyAccessWithoutParticipant(
        null,
        device.currentZoneId,
        dto,
        ctx,
        scannedAt,
        'QR kod yaroqsiz yoki o\'qib bo\'lmadi',
      );
    }
  }

  private async persistAccessLog(
    participantId: string,
    zoneId: string,
    dto: ScanAccessDto,
    ctx: ScanContext,
    scannedAt: Date,
    granted: boolean,
    denyReason: string | null,
  ) {
    try {
      const log = await this.accessLogRepo.create({
        participant: participantId ? { connect: { id: participantId } } : undefined,
        zone: { connect: { id: zoneId } },
        direction: dto.direction as unknown as Direction,
        result: granted ? ScanResultStatus.GRANTED : ScanResultStatus.DENIED,
        denyReason: denyReason ?? undefined,
        scannedAt,
        device: ctx.deviceId ? { connect: { id: ctx.deviceId } } : undefined,
        clientEventId: dto.clientEventId,
        syncedAt: dto.scannedAt ? new Date() : undefined,
      });
      this.dashboardGateway.broadcastStats().catch(() => {});
      return this.toAccessResponse(log, false);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && dto.clientEventId) {
        const existing = await this.accessLogRepo.findByClientEventId(dto.clientEventId);
        if (existing) return this.toAccessResponse(existing, true);
      }
      throw e;
    }
  }

  private async denyAccessWithoutParticipant(
    participantId: string | null,
    zoneId: string | null,
    dto: ScanAccessDto,
    ctx: ScanContext,
    scannedAt: Date,
    reason: string,
  ) {
    if (!zoneId) {
      return { granted: false, reason, participant: null, scannedAt };
    }
    return this.persistAccessLog(participantId as any, zoneId, dto, ctx, scannedAt, false, reason);
  }

  private toAccessResponse(log: any, duplicate: boolean) {
    return {
      granted: log.result === ScanResultStatus.GRANTED,
      reason: log.denyReason,
      direction: log.direction,
      zone: log.zone ? { id: log.zone.id, name: log.zone.name, code: log.zone.code } : undefined,
      participant: log.participant
        ? {
            id: log.participant.id,
            fullName: `${log.participant.lastName} ${log.participant.firstName}`,
            category: log.participant.accreditationType?.name,
            categoryColor: log.participant.accreditationType?.color,
          }
        : null,
      scannedAt: log.scannedAt,
      duplicate,
    };
  }

  // ------------------------------------------------------------------
  // OVQATLANISH NAZORATI (FT-11 .. FT-14)
  // ------------------------------------------------------------------
  async scanMeal(dto: ScanMealDto, ctx: ScanContext) {
    const scannedAt = dto.scannedAt ? new Date(dto.scannedAt) : new Date();

    if (dto.clientEventId) {
      const existing = await this.mealLogRepo.findByClientEventId(dto.clientEventId);
      if (existing) return this.toMealResponseFromLog(existing, true);
    }

    let payload;
    try {
      payload = await this.qrTokenService.verify(dto.qrToken);
    } catch {
      return { granted: false, reason: 'QR kod yaroqsiz yoki o\'qib bo\'lmadi', scannedAt };
    }

    const participant = await this.participantsRepo.findById(payload.pid);

    if (!participant || participant.qrTokenId !== payload.tid || participant.qrTokenVersion !== payload.v) {
      return { granted: false, reason: 'QR kod eskirgan yoki bekor qilingan', scannedAt };
    }

    if (participant.badgeStatus !== BadgeStatus.ACTIVE) {
      return this.persistMealDeny(null, dto, ctx, scannedAt, participant.id,
        participant.badgeStatus === BadgeStatus.BLOCKED ? 'Badge bloklangan' : 'Badge muddati tugagan');
    }

    if (!participant.accreditationType.mealAllowed) {
      return this.persistMealDeny(null, dto, ctx, scannedAt, participant.id, 'Sizning kategoriyangiz uchun ovqatlanish nazarda tutilmagan');
    }

    // FT-12: joriy vaqtga mos ovqat turi jadvalini topamiz
    const schedule = await this.mealScheduleService.findActiveScheduleForNow(scannedAt);
    if (!schedule) {
      const nearestMissed = await this.mealScheduleRepo.findNearestMissed(this.toDateOnly(scannedAt), scannedAt);
      const reason = nearestMissed
        ? `${this.mealLabel(nearestMissed.mealType)} vaqti tugagan`
        : 'Hozir hech qanday ovqatlanish vaqti belgilanmagan';
      return this.persistMealDeny(null, dto, ctx, scannedAt, participant.id, reason);
    }

    const allowedForMeal = await this.mealScheduleRepo.isAccreditationAllowed(schedule.id, participant.accreditationTypeId);

    if (!allowedForMeal) {
      return this.persistMealDeny(
        schedule.id,
        dto,
        ctx,
        scannedAt,
        participant.id,
        `Sizning kategoriyangiz uchun ${this.mealLabel(schedule.mealType)} nazarda tutilmagan`,
      );
    }

    // FT-13: bir kunda bir marta tekshiruvi
    const alreadyTaken = await this.mealLogRepo.findFirstGranted(participant.id, schedule.id);

    if (alreadyTaken) {
      const time = alreadyTaken.scannedAt.toLocaleTimeString('uz-UZ', {
        timeZone: 'Asia/Tashkent',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return this.persistMealDeny(
        schedule.id,
        dto,
        ctx,
        scannedAt,
        participant.id,
        `Siz bugun ${this.mealLabel(schedule.mealType).toLowerCase()}ni allaqachon olgansiz (${time} da)`,
      );
    }

    // Ruxsat berildi
    return this.persistMealLog(schedule.id, dto, ctx, scannedAt, participant.id, true, null);
  }

  private async persistMealLog(
    mealScheduleId: string,
    dto: ScanMealDto,
    ctx: ScanContext,
    scannedAt: Date,
    participantId: string,
    granted: boolean,
    denyReason: string | null,
  ) {
    try {
      const log = await this.mealLogRepo.create({
        participant: { connect: { id: participantId } },
        mealSchedule: { connect: { id: mealScheduleId } },
        result: granted ? ScanResultStatus.GRANTED : ScanResultStatus.DENIED,
        denyReason: denyReason ?? undefined,
        scannedAt,
        device: ctx.deviceId ? { connect: { id: ctx.deviceId } } : undefined,
        clientEventId: dto.clientEventId,
        syncedAt: dto.scannedAt ? new Date() : undefined,
      });
      this.dashboardGateway.broadcastStats().catch(() => {});
      return this.toMealResponseFromLog(log, false);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && dto.clientEventId) {
        const existing = await this.mealLogRepo.findByClientEventId(dto.clientEventId);
        if (existing) return this.toMealResponseFromLog(existing, true);
      }
      throw e;
    }
  }

  private persistMealDeny(
    mealScheduleId: string | null,
    dto: ScanMealDto,
    ctx: ScanContext,
    scannedAt: Date,
    participantId: string,
    reason: string,
  ) {
    if (!mealScheduleId) {
      return { granted: false, reason, participantId, scannedAt };
    }
    return this.persistMealLog(mealScheduleId, dto, ctx, scannedAt, participantId, false, reason);
  }

  private toMealResponseFromLog(log: any, duplicate: boolean) {
    return {
      granted: log.result === ScanResultStatus.GRANTED,
      reason: log.denyReason,
      mealType: log.mealSchedule?.mealType,
      participant: log.participant
        ? {
            id: log.participant.id,
            fullName: `${log.participant.lastName} ${log.participant.firstName}`,
            category: log.participant.accreditationType?.name,
          }
        : null,
      scannedAt: log.scannedAt,
      duplicate,
    };
  }

  private mealLabel(mealType: string): string {
    const labels: Record<string, string> = {
      BREAKFAST: 'Nonushta',
      LUNCH: 'Tushlik',
      DINNER: 'Kechki ovqat',
    };
    return labels[mealType] || mealType;
  }

  private toDateOnly(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  // FT-18: oxirgi 10 ta skan tarixi
  async getRecentScans(deviceId: string) {
    const [accessLogs, mealLogs] = await Promise.all([
      this.accessLogRepo.findRecentByDevice(deviceId, 10),
      this.mealLogRepo.findRecentByDevice(deviceId, 10),
    ]);

    const combined = [
      ...accessLogs.map((l) => ({
        type: 'access' as const,
        result: l.result,
        reason: l.denyReason,
        fullName: l.participant ? `${l.participant.lastName} ${l.participant.firstName}` : null,
        detail: l.zone?.name,
        scannedAt: l.scannedAt,
      })),
      ...mealLogs.map((l) => ({
        type: 'meal' as const,
        result: l.result,
        reason: l.denyReason,
        fullName: l.participant ? `${l.participant.lastName} ${l.participant.firstName}` : null,
        detail: this.mealLabel(l.mealSchedule.mealType),
        scannedAt: l.scannedAt,
      })),
    ]
      .sort((a, b) => b.scannedAt.getTime() - a.scannedAt.getTime())
      .slice(0, 10);

    return combined;
  }

  // Admin panel uchun
  async verifyQrTokenForAdmin(qrToken: string) {
    try {
      const payload = await this.qrTokenService.verify(qrToken);
      const participant = await this.participantsRepo.findById(payload.pid);
      if (!participant) {
        return { valid: false, reason: 'Ishtirokchi topilmadi' };
      }
      
      if (participant.qrTokenId !== payload.tid || participant.qrTokenVersion !== payload.v) {
        return { valid: false, reason: 'QR kod eskirgan yoki bekor qilingan' };
      }

      return {
        valid: participant.badgeStatus === BadgeStatus.ACTIVE,
        reason: participant.badgeStatus !== BadgeStatus.ACTIVE ? `Badge holati: ${participant.badgeStatus}` : null,
        participant: {
          id: participant.id,
          fullName: `${participant.lastName} ${participant.firstName}`,
          category: participant.accreditationType?.name,
          categoryColor: participant.accreditationType?.color,
          organization: participant.organization,
          photoUrl: participant.photoUrl,
        }
      };
    } catch {
      return { valid: false, reason: 'QR kod yaroqsiz yoki buzilgan' };
    }
  }
}
