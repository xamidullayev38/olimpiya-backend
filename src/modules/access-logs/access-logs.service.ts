import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { AccessLogRepository } from './repositories/access-logs.repository';

export interface AccessLogQuery {
  zoneId?: string;
  participantId?: string;
  result?: 'GRANTED' | 'DENIED';
  dateFrom?: string;
  dateTo?: string;
  page?: string;
  pageSize?: string;
}

@Injectable()
export class AccessLogsService {
  constructor(private accessLogRepo: AccessLogRepository) {}

  private buildWhere(query: AccessLogQuery) {
    const where: any = {};
    if (query.zoneId) where.zoneId = query.zoneId;
    if (query.participantId) where.participantId = query.participantId;
    if (query.result) where.result = query.result;
    if (query.dateFrom || query.dateTo) {
      where.scannedAt = {};
      if (query.dateFrom) where.scannedAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.scannedAt.lte = new Date(query.dateTo);
    }
    return where;
  }

  async findAll(query: AccessLogQuery) {
    const page = Math.max(parseInt(query.page || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(query.pageSize || '50', 10), 1), 500);
    const where = this.buildWhere(query);

    const [items, total] = await Promise.all([
      this.accessLogRepo.findMany(where, (page - 1) * pageSize, pageSize),
      this.accessLogRepo.count(where),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // FT-23: rad etilgan urinishlar hisoboti
  async findDenied(query: AccessLogQuery) {
    return this.findAll({ ...query, result: 'DENIED' });
  }

  // FT-24: Excel eksport
  async exportExcel(query: AccessLogQuery): Promise<ExcelJS.Buffer> {
    const where = this.buildWhere(query);
    const logs = await this.accessLogRepo.findMany(where, 0, 50000);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Kirish tarixi');
    sheet.columns = [
      { header: 'Sana/vaqt', key: 'scannedAt', width: 20 },
      { header: 'F.I.Sh', key: 'fullName', width: 30 },
      { header: 'Kategoriya', key: 'category', width: 20 },
      { header: 'Zona', key: 'zone', width: 20 },
      { header: 'Yo\'nalish', key: 'direction', width: 12 },
      { header: 'Natija', key: 'result', width: 12 },
      { header: 'Sabab', key: 'reason', width: 30 },
    ];
    for (const log of logs) {
      sheet.addRow({
        scannedAt: log.scannedAt.toISOString().replace('T', ' ').substring(0, 19),
        fullName: log.participant ? `${log.participant.lastName} ${log.participant.firstName}` : '',
        category: log.participant?.accreditationType?.name ?? '',
        zone: log.zone?.name ?? '',
        direction: log.direction,
        result: log.result === 'GRANTED' ? 'Ruxsat berildi' : 'Rad etildi',
        reason: log.denyReason ?? '',
      });
    }
    return workbook.xlsx.writeBuffer();
  }
}
