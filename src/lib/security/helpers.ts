import { securityMonitor } from './monitoring';
import { NextApiRequest } from 'next';

export function getClientIP(req: NextApiRequest): string {
  return (req.headers['x-forwarded-for'] as string) ||
         (req.headers['x-real-ip'] as string) ||
         req.socket.remoteAddress ||
         'unknown';
}

export async function logSuspiciousActivity(
  type: 'API_ABUSE' | 'UNUSUAL_USAGE_PATTERN' | 'VULNERABILITY_DETECTED',
  req: NextApiRequest,
  metadata?: Record<string, any>
) {
  await securityMonitor.logSecurityEvent({
    type,
    severity: 'HIGH',
    ipAddress: getClientIP(req),
    userAgent: req.headers['user-agent'] as string,
    metadata: {
      endpoint: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
      ...metadata
    }
  });
}

export async function logSecurityPolicyViolation(
  req: NextApiRequest,
  violation: string,
  userId?: string,
  email?: string
) {
  await securityMonitor.logSecurityEvent({
    type: 'SECURITY_POLICY_VIOLATION',
    severity: 'MEDIUM',
    userId,
    email,
    ipAddress: getClientIP(req),
    userAgent: req.headers['user-agent'] as string,
    metadata: {
      violation,
      endpoint: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    }
  });
}