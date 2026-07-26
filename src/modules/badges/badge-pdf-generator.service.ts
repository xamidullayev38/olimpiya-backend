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
    data: { fullName: string; category: string; color: string; organization: string; qrBuffer: Buffer },
  ) {
    // Yuqori rangli panel (kategoriya rangi)
    doc.rect(0, 0, CARD_WIDTH, 70).fill(data.color);
    doc
      .fillColor('#ffffff')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(data.category.toUpperCase(), 12, 26, { width: CARD_WIDTH - 24, align: 'center' });

    // F.I.Sh
    doc
      .fillColor('#111111')
      .fontSize(15)
      .font('Helvetica-Bold')
      .text(data.fullName, 12, 90, { width: CARD_WIDTH - 24, align: 'center' });

    if (data.organization) {
      doc
        .fillColor('#555555')
        .fontSize(10)
        .font('Helvetica')
        .text(data.organization, 12, 115, { width: CARD_WIDTH - 24, align: 'center' });
    }

    // QR kod markazda
    const qrSize = 170;
    doc.image(data.qrBuffer, (CARD_WIDTH - qrSize) / 2, 150, { width: qrSize, height: qrSize });

    // Pastki chiziq
    doc
      .fillColor('#999999')
      .fontSize(8)
      .text('Ushbu badge shaxsiyatni tasdiqlovchi hujjat emas', 12, CARD_HEIGHT - 30, {
        width: CARD_WIDTH - 24,
        align: 'center',
      });
  }
}
