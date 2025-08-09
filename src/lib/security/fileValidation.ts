import { createHash } from 'crypto';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export class FileValidator {
  private static readonly ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]);

  private static readonly MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
  private static readonly DANGEROUS_EXTENSIONS = new Set([
    '.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.js', '.jar', '.sh'
  ]);

  static async validateFile(file: {
    name: string;
    buffer: Buffer;
    mimetype: string;
    size: number;
  }): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 1. Size validation
    if (file.size > this.MAX_FILE_SIZE) {
      errors.push(`File too large: ${file.size} bytes (max: ${this.MAX_FILE_SIZE})`);
    }

    if (file.size === 0) {
      errors.push('File is empty');
    }

    // 2. Extension validation
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (this.DANGEROUS_EXTENSIONS.has(ext)) {
      errors.push(`Dangerous file extension: ${ext}`);
    }

    // 3. MIME type validation
    if (!this.ALLOWED_MIME_TYPES.has(file.mimetype)) {
      errors.push(`Invalid MIME type: ${file.mimetype}`);
    }

    // 4. Magic number validation (file signature)
    const isValidSignature = await this.validateFileSignature(file.buffer, file.mimetype);
    if (!isValidSignature) {
      errors.push('File signature does not match declared type');
    }

    // 5. Content validation for specific file types
    try {
      await this.validateFileContent(file.buffer, file.mimetype);
    } catch (error) {
      errors.push(`File content validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private static async validateFileSignature(buffer: Buffer, mimetype: string): Promise<boolean> {
    if (buffer.length < 4) return false;

    const signatures: Record<string, number[][]> = {
      'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
        [0x50, 0x4B, 0x03, 0x04], // PK.. (ZIP)
        [0x50, 0x4B, 0x05, 0x06], // PK.. (ZIP)
        [0x50, 0x4B, 0x07, 0x08]  // PK.. (ZIP)
      ],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        [0x50, 0x4B, 0x03, 0x04], // PK.. (ZIP)
        [0x50, 0x4B, 0x05, 0x06], // PK.. (ZIP)
        [0x50, 0x4B, 0x07, 0x08]  // PK.. (ZIP)
      ]
    };

    const expectedSignatures = signatures[mimetype];
    if (!expectedSignatures) return true; // No signature validation for this type

    return expectedSignatures.some(signature => 
      signature.every((byte, index) => buffer[index] === byte)
    );
  }

  private static async validateFileContent(buffer: Buffer, mimetype: string): Promise<void> {
    switch (mimetype) {
      case 'application/pdf':
        await this.validatePDFContent(buffer);
        break;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        await this.validateDocxContent(buffer);
        break;
      case 'text/plain':
        await this.validateTextContent(buffer);
        break;
    }
  }

  private static async validatePDFContent(buffer: Buffer): Promise<void> {
    // Check for embedded JavaScript or suspicious content
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 10000));
    
    const suspiciousPatterns = [
      /\/JavaScript/i,
      /\/JS/i,
      /\/OpenAction/i,
      /\/Launch/i,
      /<script/i,
      /eval\(/i,
      /document\.write/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        throw new Error('PDF contains potentially malicious content');
      }
    }
  }

  private static async validateDocxContent(buffer: Buffer): Promise<void> {
    // DOCX files are ZIP archives - basic ZIP structure validation
    if (buffer.length < 30) {
      throw new Error('DOCX file too small');
    }

    // Check ZIP central directory exists
    const hasCentralDir = buffer.includes(Buffer.from([0x50, 0x4B, 0x01, 0x02]));
    if (!hasCentralDir) {
      throw new Error('Invalid DOCX structure');
    }
  }

  private static async validateTextContent(buffer: Buffer): Promise<void> {
    try {
      const text = buffer.toString('utf8');
      
      // Check for binary data in text file
      const nonPrintableChars = text.replace(/[\x20-\x7E\r\n\t]/g, '');
      if (nonPrintableChars.length > text.length * 0.05) {
        throw new Error('Text file contains too much binary data');
      }
    } catch (error) {
      throw new Error('Invalid text encoding');
    }
  }

  static generateFileHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }
}