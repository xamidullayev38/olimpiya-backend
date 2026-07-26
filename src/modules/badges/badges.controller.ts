import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { BadgesService } from './badges.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuditAction } from '../../common/decorators/audit-action.decorator';

class BulkPrintDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participantIds?: string[];
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('badge.print')
@Controller({ path: 'badges', version: '1' })
export class BadgesController {
  constructor(private service: BadgesService) {}

  @Get(':participantId/qr')
  getQr(@Param('participantId') participantId: string) {
    return this.service.getQrImageForParticipant(participantId);
  }

  @AuditAction('badge.reissue')
  @Post(':participantId/reissue')
  reissue(@Param('participantId') participantId: string) {
    return this.service.reissue(participantId);
  }

  @AuditAction('badge.print')
  @Post('print')
  async print(@Body() dto: BulkPrintDto, @Res() res: Response) {
    const filePath = await this.service.generateBulkPdf(dto.participantIds);
    res.download(filePath);
  }
}
