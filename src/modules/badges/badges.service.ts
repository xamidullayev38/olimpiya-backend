import { Injectable, NotFoundException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { QrTokenService } from './qr-token.service';
import { BadgePdfGeneratorService, BadgeItemData } from './badge-pdf-generator.service';
import { ParticipantsRepository } from '../participants/repositories/participants.repository';

@Injectable()
export class BadgesService {
  constructor(
    private participantsRepo: ParticipantsRepository,
    private qrTokenService: QrTokenService,
    private badgePdfGenerator: BadgePdfGeneratorService,
  ) {}

  /**
   * FT-2: ishtirokchi uchun QR token (ma'lumotni o'zi emas, faqat imzolangan ID) generatsiya qiladi.
   */
  async generateTokenForParticipant(participantId: string, qrTokenId: string, version: number) {
    return this.qrTokenService.sign({ pid: participantId, tid: qrTokenId, v: version });
  }

  async getQrImageForParticipant(participantId: string) {
    const participant = await this.participantsRepo.findById(participantId);
    if (!participant) throw new NotFoundException('Ishtirokchi topilmadi');

    const token = await this.qrTokenService.sign({
      pid: participant.id,
      tid: participant.qrTokenId,
      v: participant.qrTokenVersion,
    });

    const dataUrl = await QRCode.toDataURL(token, { errorCorrectionLevel: 'M', margin: 1, width: 400 });
    return { participantId, qrDataUrl: dataUrl };
  }

  /**
   * Badge chop etilganda tokenni "yangilash" (versiyani oshirish) - bu eski QR nusxalarini avtomatik yaroqsiz qiladi.
   */
  async reissue(participantId: string) {
    const participant = await this.participantsRepo.findById(participantId);
    if (!participant) throw new NotFoundException('Ishtirokchi topilmadi');

    const updated = await this.participantsRepo.incrementQrTokenVersion(participantId);

    const token = await this.qrTokenService.sign({
      pid: updated.id,
      tid: updated.qrTokenId,
      v: updated.qrTokenVersion,
    });
    return { participantId, newVersion: updated.qrTokenVersion, token };
  }

  /**
   * FT-4: Bir nechta (yoki barcha) ishtirokchi uchun ommaviy badge PDF generatsiya qiladi.
   */
  async generateBulkPdf(participantIds?: string[]): Promise<string> {
    const participants = await this.participantsRepo.findMany({
      id: participantIds && participantIds.length ? { in: participantIds } : undefined,
      badgeStatus: 'ACTIVE',
    });

    if (participants.length === 0) {
      throw new NotFoundException('Chop etish uchun faol ishtirokchilar topilmadi');
    }

    const items: BadgeItemData[] = [];
    for (const p of participants) {
      const token = await this.qrTokenService.sign({ pid: p.id, tid: p.qrTokenId, v: p.qrTokenVersion });
      items.push({
        fullName: `${p.lastName} ${p.firstName}`,
        category: p.accreditationType.name,
        color: p.accreditationType.color,
        organization: p.organization || '',
        token,
      });
    }

    return this.badgePdfGenerator.generatePdf(items);
  }
}
