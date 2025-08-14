
// ========================================
// src/lib/security/encryption.ts
// ========================================

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export class EncryptionService {
  private static algorithm = 'aes-256-gcm';
  private static keyLength = 32;
  private static ivLength = 16;
  private static tagLength = 16;

  /**
   * Derive key from password
   */
  private static async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return (await scryptAsync(password, salt, this.keyLength)) as Buffer;
  }

  /**
   * Encrypt sensitive data
   */
  static async encrypt(plaintext: string, password: string): Promise<string> {
    try {
      const salt = randomBytes(16);
      const iv = randomBytes(this.ivLength);
      const key = await this.deriveKey(password, salt);
      
      const cipher = createCipheriv(this.algorithm, key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Combine salt + iv + tag + encrypted data
      const combined = Buffer.concat([
        salt,
        iv,
        tag,
        Buffer.from(encrypted, 'hex')
      ]);
      
      return combined.toString('base64');
    } catch (error) {
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  static async decrypt(encryptedData: string, password: string): Promise<string> {
    try {
      const combined = Buffer.from(encryptedData, 'base64');
      
      const salt = combined.subarray(0, 16);
      const iv = combined.subarray(16, 16 + this.ivLength);
      const tag = combined.subarray(16 + this.ivLength, 16 + this.ivLength + this.tagLength);
      const encrypted = combined.subarray(16 + this.ivLength + this.tagLength);
      
      const key = await this.deriveKey(password, salt);
      
      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  /**
   * Hash sensitive data (one-way)
   */
  static hash(data: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
