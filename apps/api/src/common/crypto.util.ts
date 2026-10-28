import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

export class CryptoUtil {
  private static getKey(secretKey: string): Buffer {
    return crypto.scryptSync(secretKey, 'salt_saas_tenant_vault', 32);
  }

  static encrypt(plainText: string, secretKey: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = this.getKey(secretKey);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  static decrypt(cipherText: string, secretKey: string): string {
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      // Return as-is if unencrypted fallback
      return cipherText;
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = this.getKey(secretKey);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
