// ========================================
// src/lib/security/csrf-protection.ts
// ========================================

import { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes, createHmac } from 'crypto';

export class CSRFProtection {
  private static secret = process.env.NEXTAUTH_SECRET || 'fallback-secret';

  /**
   * Generate CSRF token
   */
  static generateToken(): string {
    const timestamp = Date.now().toString();
    const randomValue = randomBytes(32).toString('hex');
    const payload = `${timestamp}.${randomValue}`;
    const signature = createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex');
    
    return `${payload}.${signature}`;
  }

  /**
   * Validate CSRF token
   */
  static validateToken(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      const [timestamp, randomValue, signature] = parts;
      const payload = `${timestamp}.${randomValue}`;
      
      // Verify signature
      const expectedSignature = createHmac('sha256', this.secret)
        .update(payload)
        .digest('hex');
      
      if (signature !== expectedSignature) return false;
      
      // Check timestamp (token expires after 1 hour)
      const tokenTime = parseInt(timestamp);
      const now = Date.now();
      const maxAge = 60 * 60 * 1000; // 1 hour
      
      return (now - tokenTime) < maxAge;
    } catch {
      return false;
    }
  }

  /**
   * Middleware to protect against CSRF
   */
  static middleware() {
    return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => {
      return async (req: NextApiRequest, res: NextApiResponse) => {
        // Skip CSRF check for GET requests
        if (req.method === 'GET') {
          return handler(req, res);
        }

        // Skip CSRF check for webhook endpoints
        if (req.url?.startsWith('/api/stripe/webhook')) {
          return handler(req, res);
        }

        const token = req.headers['x-csrf-token'] as string || 
                     req.body?.csrfToken || 
                     req.query.csrfToken as string;

        if (!token || !this.validateToken(token)) {
          return res.status(403).json({ 
            error: 'Invalid CSRF token',
            message: 'Request blocked for security reasons'
          });
        }

        return handler(req, res);
      };
    };
  }
}