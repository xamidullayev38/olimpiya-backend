import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * PINFL kabi shaxsiy ma'lumotlarni bazada saqlashdan oldin shifrlash uchun.
 * AES-256-GCM ishlatiladi (authenticated encryption - o'zgartirishga qarshi himoyalangan).
 * Format: base64(iv):base64(authTag):base64(ciphertext)
 */
export class EncryptionUtil {
  private static getKey(secret: string): Buffer {
    // 32-byte kalit hosil qilish uchun scrypt (secret muhit o'zgaruvchisidan kelgan bo'lishi kerak)
    return scryptSync(secret, 'qr-badge-static-salt-v1', 32);
  }

  static encrypt(plainText: string, secret: string): string {
    const iv = randomBytes(12);
    const key = this.getKey(secret);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
  }

  static decrypt(payload: string, secret: string): string {
    const [ivB64, authTagB64, dataB64] = payload.split(':');
    const key = this.getKey(secret);
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}
