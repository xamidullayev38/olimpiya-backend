import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { MealLogRepository } from './repositories/meal-logs.repository';

export interface MealLogQuery {
  mealScheduleId?: string;
  participantId?: string;
  result?: 'GRANTED' | 'DENIED';
  dateFrom?: string;
  dateTo?: string;
  page?: string;
  pageSize?: string;
}

@Injectable()
export class MealLogsService {
  constructor(private mealLogRepo: MealLogRepository) {}

  private buildWhere(query: MealLogQuery) {
    const where: any = {};
    if (query.mealScheduleId) where.mealScheduleId = query.mealScheduleId;
    if (query.participantId) where.participantId = query.participantId;
    if (query.result) where.result = query.result;
    if (query.dateFrom || query.dateTo) {
      where.scannedAt = {};
      if (query.dateFrom) where.scannedAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.scannedAt.lte = new Date(query.dateTo);
    }
    return where;
  }

  async findAll(query: MealLogQuery) {
    const page = Math.max(parseInt(query.page || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(query.pageSize || '50', 10), 1), 500);
    const where = this.buildWhere(query);

    const [items, total] = await Promise.all([
      this.mealLogRepo.findMany(where, (page - 1) * pageSize, pageSize),
      this.mealLogRepo.count(where),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // FT-22: kunlik/soatlik ovqatlanish statistikasi
  async getDailyStats(date: string) {
    const dayStart = new Date(date + 'T00:00:00.000Z');
    const dayEnd = new Date(date + 'T23:59:59.999Z');

    const logs = await this.mealLogRepo.findMany({
      scannedAt: { gte: dayStart, lte: dayEnd },
      result: 'GRANTED',
    });

    const grouped: Record<string, number> = {};
    for (const log of logs) {
      const key = log.mealSchedule.mealType;
      grouped[key] = (grouped[key] || 0) + 1;
    }
    return { date, totals: grouped, totalServed: logs.length };
  }

  async exportExcel(query: MealLogQuery): Promise<ExcelJS.Buffer> {
    const where = this.buildWhere(query);
    const logs = await this.mealLogRepo.findMany(where, 0, 50000);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Ovqatlanish tarixi');
    sheet.columns = [
      { header: 'Sana/vaqt', key: 'scannedAt', width: 20 },
      { header: 'F.I.Sh', key: 'fullName', width: 30 },
      { header: 'Kategoriya', key: 'category', width: 20 },
      { header: 'Ovqat turi', key: 'mealType', width: 14 },
      { header: 'Natija', key: 'result', width: 14 },
      { header: 'Sabab', key: 'reason', width: 30 },
    ];
    for (const log of logs) {
      sheet.addRow({
        scannedAt: log.scannedAt.toISOString().replace('T', ' ').substring(0, 19),
        fullName: log.participant ? `${log.participant.lastName} ${log.participant.firstName}` : '',
        category: log.participant?.accreditationType?.name ?? '',
        mealType: log.mealSchedule?.mealType ?? '',
        result: log.result === 'GRANTED' ? 'Berildi' : 'Rad etildi',
        reason: log.denyReason ?? '',
      });
    }
    return workbook.xlsx.writeBuffer();
  }

  async exportPdf(query: MealLogQuery): Promise<Buffer> {
    const where = this.buildWhere(query);
    const logs = await this.mealLogRepo.findMany(where, 0, 1000);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      doc.fontSize(16).font('Helvetica-Bold').text('Ovqatlanish Tarixi Hisoboti', { align: 'center' });
      doc.moveDown();

      for (const log of logs) {
        const timeStr = log.scannedAt.toISOString().replace('T', ' ').substring(0, 19);
        const nameStr = log.participant ? `${log.participant.lastName} ${log.participant.firstName}` : 'Noma\'lum';
        const resStr = log.result === 'GRANTED' ? 'BERILDI' : 'RAD';
        const line = `${timeStr} | ${nameStr} | Ovqat: ${log.mealSchedule?.mealType || '-'} | Natija: ${resStr} ${log.denyReason ? `(${log.denyReason})` : ''}`;
        doc.fontSize(9).font('Helvetica').text(line);
      }

      doc.end();
    });
  }
}
