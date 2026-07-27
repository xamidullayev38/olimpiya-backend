import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

const CARD_WIDTH = 242; // ~85.6mm @ 72dpi standart badge kengligi
const CARD_HEIGHT = 384; // ~135.5mm

export interface BadgeItemData {
  fullName: string;
  category: string;
  color: string;
  organization: string;
  photoUrl?: string;
  token: string;
}

@Injectable()
export class BadgePdfGeneratorService {
  constructor(private config: ConfigService) {}

  async generatePdf(items: BadgeItemData[]): Promise<string> {
    const outputDir = this.config.get<string>('BADGE_OUTPUT_DIR') || './storage/badges';
    fs.mkdirSync(outputDir, { recursive: true });
    const fileName = `badges-${Date.now()}.pdf`;
    const filePath = path.join(outputDir, fileName);

    const doc = new PDFDocument({ size: [CARD_WIDTH, CARD_HEIGHT], margin: 0 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (i > 0) doc.addPage({ size: [CARD_WIDTH, CARD_HEIGHT], margin: 0 });

      const qrBuffer = await QRCode.toBuffer(item.token, { errorCorrectionLevel: 'M', margin: 0, width: 300 });

      this.drawBadgeTemplate(doc, {
        fullName: item.fullName,
        category: item.category,
        color: item.color,
        organization: item.organization,
        photoUrl: item.photoUrl,
        qrBuffer,
      });
    }

    doc.end();
    await new Promise<void>((resolve, reject) => {
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });

    return filePath;
  }

  private drawBadgeTemplate(
    doc: PDFKit.PDFDocument,
    data: { fullName: string; category: string; color: string; organization: string; photoUrl?: string; qrBuffer: Buffer },
  ) {
    // Yuqori rangli panel (kategoriya rangi)
    doc.rect(0, 0, CARD_WIDTH, 60).fill(data.color);
    doc
      .fillColor('#ffffff')
      .fontSize(15)
      .font('Helvetica-Bold')
      .text(data.category.toUpperCase(), 12, 22, { width: CARD_WIDTH - 24, align: 'center' });

    // Ishtirokchi rasmi yoki avatar ramkasi
    const avatarWidth = 60;
    const avatarHeight = 70;
    const avatarX = (CARD_WIDTH - avatarWidth) / 2;
    const avatarY = 70;

    let photoLoaded = false;
    if (data.photoUrl && fs.existsSync(data.photoUrl)) {
      try {
        doc.image(data.photoUrl, avatarX, avatarY, { width: avatarWidth, height: avatarHeight });
        photoLoaded = true;
      } catch {
        // quiet fallback
      }
    }

    if (!photoLoaded) {
      doc.rect(avatarX, avatarY, avatarWidth, avatarHeight).fillAndStroke('#e5e7eb', '#d1d5db');
      doc.fillColor('#9ca3af').fontSize(24).font('Helvetica-Bold').text('PHOTO', avatarX, avatarY + 25, { width: avatarWidth, align: 'center' });
    }

    // F.I.Sh
    doc
      .fillColor('#111111')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(data.fullName, 12, 150, { width: CARD_WIDTH - 24, align: 'center' });

    if (data.organization) {
      doc
        .fillColor('#555555')
        .fontSize(10)
        .font('Helvetica')
        .text(data.organization, 12, 170, { width: CARD_WIDTH - 24, align: 'center' });
    }

    // QR kod markazda
    const qrSize = 150;
    doc.image(data.qrBuffer, (CARD_WIDTH - qrSize) / 2, 190, { width: qrSize, height: qrSize });

    // Pastki chiziq
    doc
      .fillColor('#999999')
      .fontSize(8)
      .text('Ushbu badge shaxsiyatni tasdiqlovchi hujjat emas', 12, CARD_HEIGHT - 25, {
        width: CARD_WIDTH - 24,
        align: 'center',
      });
  }
}
