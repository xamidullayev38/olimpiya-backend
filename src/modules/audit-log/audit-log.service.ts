import { Injectable } from '@nestjs/common';
import { AuditLogRepository } from './repositories/audit-log.repository';

export interface AuditLogQuery {
  userId?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
  pageSize?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private auditLogRepo: AuditLogRepository) {}

  async findAll(query: AuditLogQuery) {
    const page = Math.max(parseInt(query.page || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(query.pageSize || '50', 10), 1), 500);

    const where: any = {};
    if (query.userId) where.userId = query.userId;
    if (query.entityType) where.entityType = query.entityType;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const [items, total] = await Promise.all([
      this.auditLogRepo.findMany(where, (page - 1) * pageSize, pageSize),
      this.auditLogRepo.count(where),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
