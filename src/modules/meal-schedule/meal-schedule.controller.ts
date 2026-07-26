import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { MealScheduleService } from './meal-schedule.service';
import { CreateMealScheduleDto } from './dto/create-meal-schedule.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuditAction } from '../../common/decorators/audit-action.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'meal-schedule', version: '1' })
export class MealScheduleController {
  constructor(private service: MealScheduleService) {}

  @RequirePermissions('report.view')
  @Get()
  findAll(@Query('date') date?: string) {
    return this.service.findAll(date);
  }

  @RequirePermissions('report.view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @RequirePermissions('meal_schedule.manage')
  @AuditAction('meal_schedule.create')
  @Post()
  create(@Body() dto: CreateMealScheduleDto) {
    return this.service.create(dto);
  }

  @RequirePermissions('meal_schedule.manage')
  @AuditAction('meal_schedule.deactivate')
  @Post(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }
}
