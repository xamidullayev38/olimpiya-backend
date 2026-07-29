import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import * as ExcelJS from 'exceljs';

export interface ParsedParticipantRow {
  firstName: string;
  lastName: string;
  middleName?: string;
  pinfl?: string;
  birthDate?: string;
  documentNumber?: string;
  phone?: string;
  organization?: string;
  region?: string;
  sportType?: string;
  accreditationTypeCode: string;
}

@Injectable()
export class ParticipantImportParserService {
  async parseFile(fileBuffer: Buffer, mimeType?: string, fileName?: string): Promise<ParsedParticipantRow[]> {
    const isExcel =
      (mimeType && (mimeType.includes('spreadsheet') || mimeType.includes('excel'))) ||
      (fileName && (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')));

    if (isExcel) {
      return this.parseExcel(fileBuffer);
    }
    return this.parseCsv(fileBuffer);
  }

  private parseCsv(fileBuffer: Buffer): ParsedParticipantRow[] {
    try {
      const records = parse(fileBuffer, { columns: true, skip_empty_lines: true, trim: true });
      return records.map(this.normalizeRow);
    } catch {
      throw new BadRequestException("CSV faylni o'qib bo'lmadi. Noto'g'ri format");
    }
  }

  private async parseExcel(fileBuffer: Buffer): Promise<ParsedParticipantRow[]> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new BadRequestException('Excel fayl bo\'sh');
      }

      const rows: ParsedParticipantRow[] = [];
      let headers: string[] = [];

      worksheet.eachRow((row, rowNumber) => {
        const values = row.values as any[];
        // ExcelJS row.values is 1-indexed (index 0 is undefined)
        const rowData = values.slice(1).map((v) => {
          if (v === null || v === undefined) return '';
          if (v instanceof Date) return v.toISOString().split('T')[0]; // YYYY-MM-DD
          return String(v).trim();
        });

        if (rowNumber === 1) {
          headers = rowData;
        } else if (rowData.some((cell) => cell.length > 0)) {
          const rowObj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            if (h) rowObj[h] = rowData[idx] || '';
          });
          rows.push(this.normalizeRow(rowObj));
        }
      });

      return rows;
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException("Excel (.xlsx) faylni o'qib bo'lmadi. Noto'g'ri format");
    }
  }

  private normalizeRow(row: Record<string, any>): ParsedParticipantRow {
    let firstName = row.firstName || row.first_name || '';
    let lastName = row.lastName || row.last_name || '';
    let middleName = row.middleName || row.middle_name || undefined;

    const rawFullName = row['F.I.Sh'] || row['f.i.sh'] || row.fullName || row.full_name || row['FIO'] || row['fio'];
    if (rawFullName && (!firstName || !lastName)) {
      const parts = String(rawFullName).trim().split(/\s+/);
      if (parts.length === 1) {
        firstName = parts[0];
        lastName = '—';
      } else if (parts.length === 2) {
        lastName = parts[0];
        firstName = parts[1];
      } else if (parts.length >= 3) {
        lastName = parts[0];
        firstName = parts[1];
        middleName = parts.slice(2).join(' ');
      }
    }

    return {
      firstName,
      lastName,
      middleName,
      pinfl: row.pinfl ? String(row.pinfl).trim() : undefined,
      birthDate: row.birthDate || row.birth_date || undefined,
      documentNumber: row.documentNumber || row.document_number || undefined,
      phone: row.phone ? String(row.phone).trim() : undefined,
      organization: row.organization || undefined,
      region: row.region || undefined,
      sportType: row.sportType || row.sport_type || undefined,
      accreditationTypeCode: String(row.accreditationTypeCode || row.accreditation_type_code || row.accreditationType || '').trim(),
    };
  }
}
