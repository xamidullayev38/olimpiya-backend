import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateMealScheduleDto } from './dto/create-meal-schedule.dto';
import { MealScheduleRepository } from './repositories/meal-schedule.repository';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MealScheduleService {
  constructor(
    private mealScheduleRepo: MealScheduleRepository,
    private prisma: PrismaService,
  ) {}

  private combineDateTime(dateStr: string, timeStr: string): Date {
    const [h, m] = timeStr.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m) || h > 23 || m > 59) {
      throw new BadRequestException('Vaqt formati noto\'g\'ri (HH:mm bo\'lishi kerak)');
    }
    const d = new Date(dateStr + 'T00:00:00.000Z');
    d.setUTCHours(h, m, 0, 0);
    return d;
  }

  async create(dto: CreateMealScheduleDto) {
    const startTime = this.combineDateTime(dto.date, dto.startTime);
    const endTime = this.combineDateTime(dto.date, dto.endTime);
    if (endTime <= startTime) {
      throw new BadRequestException('Tugash vaqti boshlanish vaqtidan keyin bo\'lishi kerak');
    }

    const existing = await this.prisma.mealSchedule.findUnique({
      where: { date_mealType: { date: new Date(dto.date), mealType: dto.mealType as any } },
    });
    if (existing) throw new ConflictException('Bu sana va ovqat turi uchun jadval allaqachon mavjud');

    return this.mealScheduleRepo.create({
      date: new Date(dto.date),
      mealType: dto.mealType as any,
      startTime,
      endTime,
      allowedTypes: {
        create: dto.allowedAccreditationTypeIds.map((accreditationTypeId) => ({ accreditationTypeId })),
      },
    });
  }

  findAll(date?: string) {
    return this.mealScheduleRepo.findMany(date ? { date: new Date(date) } : undefined);
  }

  async findOne(id: string) {
    const schedule = await this.mealScheduleRepo.findById(id);
    if (!schedule) throw new NotFoundException('Ovqatlanish jadvali topilmadi');
    return schedule;
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.mealSchedule.update({ where: { id }, data: { isActive: false } });
  }

  /**
   * Berilgan vaqt uchun mos keluvchi FAOL meal-schedule yozuvini topadi (FT-12).
   */
  async findActiveScheduleForNow(now: Date = new Date()) {
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return this.mealScheduleRepo.findActiveScheduleForNow(dayStart, now);
  }
}
