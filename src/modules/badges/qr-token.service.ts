import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface QrTokenPayload {
  pid: string; // participant.id
  tid: string; // participant.qrTokenId (badge chop etilganda o'zgarmaydi, faqat versiya oshadi)
  v: number; // qrTokenVersion - badge qayta chop etilsa eskisi shu orqali yaroqsizlanadi
}

/**
 * FT-3 / NFT-4: QR kod ichida shaxsni bevosita aniqlaydigan ochiq ma'lumot (ism, PINFL va h.k.)
 * SAQLANMAYDI - faqat imzolangan token (participant ID + versiya). Barcha ma'lumot skan vaqtida
 * serverdan so'raladi. Token JWT_ACCESS_SECRET'dan MUSTAQIL, alohida QR_TOKEN_SECRET bilan imzolanadi -
 * shunda badge tokeni sizib chiqsa ham staff sessiyalariga ta'sir qilmaydi va aksincha.
 */
@Injectable()
export class QrTokenService {
  constructor(private jwtService: JwtService, private config: ConfigService) {}

  async sign(payload: QrTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('QR_TOKEN_SECRET'),
      expiresIn: this.config.get<string>('QR_TOKEN_EXPIRES_IN') || '730d',
    });
  }

  async verify(token: string): Promise<QrTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<QrTokenPayload>(token, {
        secret: this.config.get<string>('QR_TOKEN_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('QR kod yaroqsiz yoki buzilgan');
    }
  }
}
