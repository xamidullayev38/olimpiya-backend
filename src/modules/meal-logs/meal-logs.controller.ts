import { Controller, Get, Query, Res, UseGuards, Delete } from '@nestjs/common';
import { Response } from 'express';
import { MealLogsService, MealLogQuery } from './meal-logs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('report.view')
@Controller({ path: 'meal-logs', version: '1' })
export class MealLogsController {
  constructor(private service: MealLogsService) {}

  @Get()
  findAll(@Query() query: MealLogQuery) {
    return this.service.findAll(query);
  }

  @Get('daily-stats')
  dailyStats(@Query('date') date: string) {
    return this.service.getDailyStats(date);
  }

  @RequirePermissions('report.export')
  @Get('export/excel')
  async exportExcel(@Query() query: MealLogQuery, @Res() res: Response) {
    const buffer = await this.service.exportExcel(query);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="meal-logs.xlsx"',
    });
    res.send(buffer);
  }

  @RequirePermissions('report.export')
  @Get('export/pdf')
  async exportPdf(@Query() query: MealLogQuery, @Res() res: Response) {
    const buffer = await this.service.exportPdf(query);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="meal-logs.pdf"',
    });
    res.send(buffer);
  }

  @RequirePermissions('report.export')
  @Delete()
  deleteMany(@Query('ids') ids: string) {
    const idArray = ids ? ids.split(',') : [];
    return this.service.deleteMany(idArray);
  }
}
