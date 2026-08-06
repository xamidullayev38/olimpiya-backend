import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AUDIT_ACTION_KEY } from '../decorators/audit-action.decorator';
import { AuditLogRepository } from '../../modules/audit-log/repositories/audit-log.repository';

/**
 * FT-28: Barcha admin panel amallari (create/update/delete) audit log'ga yoziladi.
 * @AuditAction('participant.create') dekoratori bilan belgilangan endpointlarda ishlaydi.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private auditLogRepo: AuditLogRepository,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const action = this.reflector.getAllAndOverride<string>(AUDIT_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!action) return next.handle();

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return next.handle().pipe(
      tap((result) => {
        this.auditLogRepo
          .create({
            user: user?.userId ? { connect: { id: user.userId } } : undefined,
            action,
            entityType: action.split('.')[0],
            entityId: result?.id ?? request.params?.id ?? null,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
            metadata: JSON.parse(JSON.stringify({
              method: request.method,
              path: request.originalUrl,
              body: this.sanitizeBody(request.body),
            })),
          })
          .catch((error) => {
            console.error('AuditLog yozishda xatolik:', error);
            // Audit log yozilmasa ham asosiy so'rov muvaffaqiyatli yakunlangan bo'lishi kerak
          });
      }),
    );
  }

  private sanitizeBody(body: any) {
    if (!body || typeof body !== 'object') return body;
    const clone = { ...body };
    for (const key of ['password', 'passwordHash', 'pinfl', 'token']) {
      if (key in clone) clone[key] = '***';
    }
    return clone;
  }
}
