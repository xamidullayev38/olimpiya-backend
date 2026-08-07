import { Controller, Get, Query, Res, UseGuards, Delete } from '@nestjs/common';
import { Response } from 'express';
import { AccessLogsService, AccessLogQuery } from './access-logs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('report.view')
@Controller({ path: 'access-logs', version: '1' })
export class AccessLogsController {
  constructor(private service: AccessLogsService) {}

  @Get()
  findAll(@Query() query: AccessLogQuery) {
    return this.service.findAll(query);
  }

  @Get('denied')
  findDenied(@Query() query: AccessLogQuery) {
    return this.service.findDenied(query);
  }

  @RequirePermissions('report.export')
  @Get('export/excel')
  async exportExcel(@Query() query: AccessLogQuery, @Res() res: Response) {
    const buffer = await this.service.exportExcel(query);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="access-logs.xlsx"',
    });
    res.send(buffer);
  }

  @RequirePermissions('report.export')
  @Get('export/pdf')
  async exportPdf(@Query() query: AccessLogQuery, @Res() res: Response) {
    const buffer = await this.service.exportPdf(query);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="access-logs.pdf"',
    });
    res.send(buffer);
  }

  @RequirePermissions('report.export') // We can use a different permission if needed, but export or write permission works
  @Delete()
  deleteMany(@Query('ids') ids: string) {
    const idArray = ids ? ids.split(',') : [];
    return this.service.deleteMany(idArray);
  }
}
