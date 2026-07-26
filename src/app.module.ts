import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { validationSchema } from './config/validation.schema';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { AccreditationTypesModule } from './modules/accreditation-types/accreditation-types.module';
import { ZonesModule } from './modules/zones/zones.module';
import { MealScheduleModule } from './modules/meal-schedule/meal-schedule.module';
import { ParticipantsModule } from './modules/participants/participants.module';
import { BadgesModule } from './modules/badges/badges.module';
import { DevicesModule } from './modules/devices/devices.module';
import { ScanModule } from './modules/scan/scan.module';
import { AccessLogsModule } from './modules/access-logs/access-logs.module';
import { MealLogsModule } from './modules/meal-logs/meal-logs.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SyncModule } from './modules/sync/sync.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { HealthModule } from './modules/health/health.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      envFilePath: ['.env'],
    }),

    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            ttl: (parseInt(process.env.THROTTLE_TTL || '60', 10)) * 1000,
            limit: parseInt(process.env.THROTTLE_LIMIT || '120', 10),
          },
        ],
      }),
    }),

    ScheduleModule.forRoot(),

    PrismaModule,
    RedisModule,

    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    AccreditationTypesModule,
    ZonesModule,
    MealScheduleModule,
    ParticipantsModule,
    BadgesModule,
    DevicesModule,
    ScanModule,
    AccessLogsModule,
    MealLogsModule,
    DashboardModule,
    SyncModule,
    AuditLogModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
