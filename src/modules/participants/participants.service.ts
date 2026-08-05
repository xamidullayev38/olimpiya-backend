import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EncryptionUtil } from '../../common/utils/encryption.util';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { QueryParticipantDto } from './dto/query-participant.dto';
import { ParticipantImportParserService } from './participant-import-parser.service';
import { ParticipantsRepository } from './repositories/participants.repository';
import { AccreditationTypeRepository } from '../accreditation-types/repositories/accreditation-types.repository';
import { AccessLogRepository } from '../access-logs/repositories/access-logs.repository';
import { MealLogRepository } from '../meal-logs/repositories/meal-logs.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { QrTokenService } from '../badges/qr-token.service';

interface ImportRowResult {
  row: number;
  status: 'created' | 'error';
  message?: string;
  participantId?: string;
}

@Injectable()
export class ParticipantsService {
  constructor(
    private participantsRepo: ParticipantsRepository,
    private accreditationTypeRepo: AccreditationTypeRepository,
    private accessLogRepo: AccessLogRepository,
    private mealLogRepo: MealLogRepository,
    private importParser: ParticipantImportParserService,
    private config: ConfigService,
    private prisma: PrismaService,
    private qrTokenService: QrTokenService,
  ) {}

  private get pinflSecret(): string {
    return this.config.get<string>('PINFL_ENCRYPTION_SECRET') as string;
  }

  private encryptPinfl(pinfl?: string) {
    if (!pinfl) return { pinflEncrypted: undefined, pinflLast4: undefined };
    return {
      pinflEncrypted: EncryptionUtil.encrypt(pinfl, this.pinflSecret),
      pinflLast4: pinfl.slice(-4),
    };
  }

  async create(dto: CreateParticipantDto, createdById?: string) {
    // accreditationTypeId sifatida UUID yoki CODE berilishi mumkin
    const accreditationType =
      (await this.accreditationTypeRepo.findById(dto.accreditationTypeId)) ??
      (await this.accreditationTypeRepo.findByCode(dto.accreditationTypeId.toUpperCase()));
    if (!accreditationType) throw new BadRequestException('Akkreditatsiya turi topilmadi');

    const { pinfl, birthDate, accreditationTypeId, ...rest } = dto;
    
    if (rest.documentNumber) {
      const existingDoc = await this.participantsRepo.findMany({ documentNumber: rest.documentNumber });
      if (existingDoc.length > 0) throw new BadRequestException('Ushbu hujjat raqamiga ega ishtirokchi allaqachon mavjud');
    } else {
      const existingName = await this.participantsRepo.findMany({ firstName: rest.firstName, lastName: rest.lastName });
      if (existingName.length > 0) throw new BadRequestException('Ushbu ism va familiyaga ega ishtirokchi allaqachon mavjud');
    }

    const { pinflEncrypted, pinflLast4 } = this.encryptPinfl(pinfl);

    const participant = await this.participantsRepo.create({
      ...rest,
      birthDate: birthDate ? new Date(birthDate) : undefined,
      pinflEncrypted,
      pinflLast4,
      createdBy: createdById ? { connect: { id: createdById } } : undefined,
      accreditationType: { connect: { id: accreditationType.id } },
    });

    const qrToken = await this.qrTokenService.sign({ pid: participant.id, tid: participant.qrTokenId, v: participant.qrTokenVersion });
    return { ...participant, qrToken };
  }

  async findAll(query: QueryParticipantDto) {
    const page = Math.max(parseInt(query.page || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(query.pageSize || '20', 10), 1), 200);

    const where: any = {};
    if (query.accreditationTypeId && query.accreditationTypeId !== 'ALL') {
      where.accreditationTypeId = query.accreditationTypeId;
    }
    if (query.accreditation && query.accreditation !== 'ALL') {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { accreditationTypeId: query.accreditation },
          { accreditationType: { code: query.accreditation } },
        ],
      });
    }
    if (query.badgeStatus) where.badgeStatus = query.badgeStatus;
    if (query.search) {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { documentNumber: { contains: query.search, mode: 'insensitive' } },
          { organization: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    const [items, total] = await Promise.all([
      this.participantsRepo.findMany(where, (page - 1) * pageSize, pageSize),
      this.participantsRepo.count(where),
    ]);

    const itemsWithQrTokens = await Promise.all(
      items.map(async (p) => {
        const qrToken = await this.qrTokenService.sign({ pid: p.id, tid: p.qrTokenId, v: p.qrTokenVersion });
        return { ...p, qrToken };
      })
    );

    return { items: itemsWithQrTokens, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    const participant = await this.participantsRepo.findById(id);
    if (!participant) throw new NotFoundException('Ishtirokchi topilmadi');
    const qrToken = await this.qrTokenService.sign({ pid: participant.id, tid: participant.qrTokenId, v: participant.qrTokenVersion });
    return { ...participant, qrToken };
  }

  // FT-25: ishtirokchi bo'yicha to'liq tarix
  async getFullHistory(id: string) {
    await this.findOne(id);
    const [accessLogs, mealLogs] = await Promise.all([
      this.accessLogRepo.findMany({ participantId: id }),
      this.mealLogRepo.findMany({ participantId: id }),
    ]);
    return { accessLogs, mealLogs };
  }

  async update(id: string, dto: UpdateParticipantDto) {
    const participant = await this.findOne(id);
    const { pinfl, birthDate, accreditationTypeId, ...rest } = dto;
    const pinflFields = pinfl ? this.encryptPinfl(pinfl) : {};

    return this.participantsRepo.update(id, {
      ...rest,
      ...pinflFields,
      birthDate: birthDate ? new Date(birthDate) : undefined,
      accreditationType: accreditationTypeId ? { connect: { id: accreditationTypeId } } : undefined,
    });
  }

  async block(id: string) {
    await this.findOne(id);
    return this.participantsRepo.updateBadgeStatus(id, 'BLOCKED');
  }

  async unblock(id: string) {
    await this.findOne(id);
    return this.participantsRepo.updateBadgeStatus(id, 'ACTIVE');
  }

  async delete(id: string) {
    await this.findOne(id);
    try {
      return await this.participantsRepo.delete(id);
    } catch (e: any) {
      if (e.code === 'P2003') {
        throw new BadRequestException('Ushbu ishtirokchiga tegishli tarixiy ma\'lumotlar mavjud bo\'lganligi sababli o\'chirib bo\'lmaydi');
      }
      throw e;
    }
  }

  /**
   * FT-1: Excel/CSV orqali ommaviy import (Phase 3: Transaction & Validation).
   */
  async importCsv(
    fileBuffer: Buffer,
    createdById?: string,
    mimeType?: string,
    fileName?: string,
  ): Promise<{ results: ImportRowResult[]; successCount: number; errorCount: number }> {
    const records = await this.importParser.parseFile(fileBuffer, mimeType, fileName);

    if (records.length > 5000) {
      throw new BadRequestException('Bir martada 5000 tadan ortiq qator import qilib bo\'lmaydi');
    }

    const accreditationTypes = await this.accreditationTypeRepo.findMany();
    const typeByCode = new Map(accreditationTypes.map((t) => [t.code.toUpperCase(), t]));

    const results: ImportRowResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Transactional batching for DB safety
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // header + 1-indexed

      try {
        if (!row.firstName || !row.lastName) {
          throw new Error('firstName va lastName majburiy');
        }
        const type = typeByCode.get((row.accreditationTypeCode || '').toUpperCase());
        if (!type) {
          throw new Error(`Noma'lum accreditationTypeCode: ${row.accreditationTypeCode}`);
        }
        if (row.pinfl && !/^\d{14}$/.test(row.pinfl)) {
          throw new Error('PINFL 14 raqamdan iborat bo\'lishi kerak');
        }

        const { pinflEncrypted, pinflLast4 } = this.encryptPinfl(row.pinfl);

        const participant = await this.prisma.$transaction(async (tx) => {
          if (row.documentNumber) {
            const existingDoc = await tx.participant.findFirst({ where: { documentNumber: row.documentNumber } });
            if (existingDoc) throw new Error('Ushbu hujjat raqamiga ega ishtirokchi allaqachon mavjud');
          } else {
            const existingName = await tx.participant.findFirst({ where: { firstName: row.firstName, lastName: row.lastName } });
            if (existingName) throw new Error('Ushbu ism va familiyaga ega ishtirokchi allaqachon mavjud');
          }
          return tx.participant.create({
            data: {
              firstName: row.firstName,
              lastName: row.lastName,
              middleName: row.middleName || undefined,
              pinflEncrypted,
              pinflLast4,
              birthDate: row.birthDate ? new Date(row.birthDate) : undefined,
              documentNumber: row.documentNumber || undefined,
              phone: row.phone || undefined,
              organization: row.organization || undefined,
              region: row.region || undefined,
              sportType: row.sportType || undefined,
              accreditationTypeId: type.id,
              createdById,
            },
          });
        });

        results.push({ row: rowNum, status: 'created', participantId: participant.id });
        successCount++;
      } catch (e: any) {
        results.push({ row: rowNum, status: 'error', message: e.message });
        errorCount++;
      }
    }

    return { results, successCount, errorCount };
  }
}
