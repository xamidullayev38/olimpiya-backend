import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParticipantsService } from './participants.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { QueryParticipantDto } from './dto/query-participant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuditAction } from '../../common/decorators/audit-action.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'participants', version: '1' })
export class ParticipantsController {
  constructor(private service: ParticipantsService) {}

  @RequirePermissions('participant.read')
  @Get()
  findAll(@Query() query: QueryParticipantDto) {
    return this.service.findAll(query);
  }

  @RequirePermissions('participant.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @RequirePermissions('participant.read')
  @Get(':id/history')
  history(@Param('id') id: string) {
    return this.service.getFullHistory(id);
  }

  @RequirePermissions('participant.create')
  @AuditAction('participant.create')
  @Post()
  create(@Body() dto: CreateParticipantDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.userId);
  }

  @RequirePermissions('participant.import')
  @AuditAction('participant.import')
  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMPORT_FILE_SIZE },
      fileFilter: (_req, file, callback) => {
        const allowedTypes = [
          'text/csv',
          'application/vnd.ms-excel',
          'text/plain',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
        const lowerName = file.originalname.toLowerCase();
        if (allowedTypes.includes(file.mimetype) || lowerName.endsWith('.csv') || lowerName.endsWith('.xlsx')) {
          return callback(null, true);
        }
        callback(new BadRequestException('Faqat CSV va Excel (.xlsx) fayllar qabul qilinadi'), false);
      },
    }),
  )
  async import(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthenticatedUser) {
    if (!file) throw new BadRequestException('Fayl yuklanmadi');
    return this.service.importCsv(file.buffer, user.userId, file.mimetype, file.originalname);
  }

  @RequirePermissions('participant.update')
  @AuditAction('participant.update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateParticipantDto) {
    return this.service.update(id, dto);
  }

  @RequirePermissions('participant.delete')
  @AuditAction('participant.block')
  @Post(':id/block')
  block(@Param('id') id: string) {
    return this.service.block(id);
  }

  @RequirePermissions('participant.update')
  @AuditAction('participant.unblock')
  @Post(':id/unblock')
  unblock(@Param('id') id: string) {
    return this.service.unblock(id);
  }
}
