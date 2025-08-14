// ========================================
// src/lib/security/api-security.ts - NEW FILE
// ========================================

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { securityMonitor } from './monitoring';
import { SessionSecurity } from './session-security';
import { AuditLogger } from './audit-logger';

export class APISecurityGuard {
  /**
   * Comprehensive API endpoint protection
   */
  static protect(options: {
    requireAuth?: boolean;
    allowedMethods?: string[];
    rateLimit?: { requests: number; windowMs: number };
    requireCSRF?: boolean;
    sensitiveOperation?: boolean;
  } = {}) {
    return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => {
      return async (req: NextApiRequest, res: NextApiResponse) => {
        const startTime = Date.now();
        let success = false;
        
        try {
          // 1. Method validation
          if (options.allowedMethods && !options.allowedMethods.includes(req.method || '')) {
            await this.logSecurityViolation(req, 'METHOD_NOT_ALLOWED', {
              method: req.method,
              allowedMethods: options.allowedMethods
            });
            return res.status(405).json({ error: 'Method not allowed' });
          }

          // 2. Authentication check
          let session = null;
          if (options.requireAuth) {
            session = await getServerSession(req, res, authOptions);
            if (!session?.user?.id) {
              await this.logSecurityViolation(req, 'UNAUTHORIZED_ACCESS', {
                endpoint: req.url
              });
              return res.status(401).json({ error: 'Authentication required' });
            }
          }

          // 3. Session security check
          if (session && options.sensitiveOperation) {
            const anomalyResult = await SessionSecurity.detectSessionAnomaly(
              session.user.id,
              'current-session', // This would be extracted from JWT in real implementation
              req
            );
            
            if (anomalyResult.isAnomalous) {
              await this.logSecurityViolation(req, 'SESSION_ANOMALY', {
                userId: session.user.id,
                reasons: anomalyResult.reasons
              });
              
              // Force re-authentication for sensitive operations
              return res.status(401).json({ 
                error: 'Session verification required',
                code: 'SESSION_ANOMALY'
              });
            }
          }

          // 4. Input validation
          if (req.body) {
            const validationResult = this.validateRequestBody(req.body);
            if (!validationResult.isValid) {
              await this.logSecurityViolation(req, 'INVALID_INPUT', {
                errors: validationResult.errors
              });
              return res.status(400).json({ 
                error: 'Invalid input',
                details: validationResult.errors
              });
            }
          }

          // 5. Execute the handler
          await handler(req, res);
          success = true;

          // 6. Log successful API call
          await AuditLogger.logAuditEvent({
            action: 'API_CALL',
            resource: req.url || 'unknown',
            userId: session?.user?.id,
            success: true,
            ipAddress: this.getClientIP(req),
            details: {
              method: req.method,
              processingTime: Date.now() - startTime
            }
          });

        } catch (error) {
          console.error('API Security Guard error:', error);
          
          // Log the error
          await AuditLogger.logAuditEvent({
            action: 'API_CALL',
            resource: req.url || 'unknown',
            userId: session?.user?.id,
            success: false,
            ipAddress: this.getClientIP(req),
            details: {
              method: req.method,
              error: error instanceof Error ? error.message : 'Unknown error',
              processingTime: Date.now() - startTime
            }
          });
          
          // Return generic error to prevent information leakage
          if (!res.headersSent) {
            return res.status(500).json({ 
              error: 'Internal server error',
              message: process.env.NODE_ENV === 'development' 
                ? (error instanceof Error ? error.message : 'Unknown error')
                : 'Something went wrong'
            });
          }
        }
      };
    };
  }

  private static async logSecurityViolation(
    req: NextApiRequest, 
    violationType: string, 
    details: Record<string, any>
  ) {
    await securityMonitor.logSecurityEvent({
      type: 'SECURITY_POLICY_VIOLATION',
      severity: 'MEDIUM',
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'] as string,
      metadata: {
        violation: violationType,
        endpoint: req.url,
        method: req.method,
        details,
        timestamp: new Date().toISOString()
      }
    });
  }

  private static validateRequestBody(body: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for basic injection patterns
    const stringifiedBody = JSON.stringify(body);
    
    const injectionPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /expression\s*\(/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];
    
    if (injectionPatterns.some(pattern => pattern.test(stringifiedBody))) {
      errors.push('Potential code injection detected');
    }
    
    // Check request size
    if (stringifiedBody.length > 1024 * 1024) { // 1MB limit
      errors.push('Request body too large');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private static getClientIP(req: NextApiRequest): string {
    return (req.headers['x-forwarded-for'] as string) ||
           (req.headers['x-real-ip'] as string) ||
           req.socket?.remoteAddress ||
           'unknown';
  }
}