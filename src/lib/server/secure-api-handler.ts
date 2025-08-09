import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { withRateLimit } from '@/lib/middleware/rateLimit';

interface SecurityOptions {
  requireAuth?: boolean;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  allowedMethods?: string[];
  maxBodySize?: number;
}

export function createSecureHandler(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  options: SecurityOptions = {}
) {
  const {
    requireAuth = true,
    rateLimit,
    allowedMethods = ['GET', 'POST'],
    maxBodySize = 10 * 1024 * 1024 // 10MB default
  } = options;

  const secureHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Method validation
      if (!allowedMethods.includes(req.method || '')) {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      // Body size validation
      const contentLength = parseInt(req.headers['content-length'] || '0');
      if (contentLength > maxBodySize) {
        return res.status(413).json({ error: 'Request too large' });
      }

      // Authentication check
      if (requireAuth) {
        const session = await getServerSession(req, res, authOptions);
        if (!session?.user?.id) {
          return res.status(401).json({ error: 'Authentication required' });
        }
      }

      // Security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

      return await handler(req, res);
    } catch (error) {
      console.error('Secure handler error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Apply rate limiting if specified
  if (rateLimit) {
    return withRateLimit(rateLimit.requests, rateLimit.windowMs)(secureHandler);
  }

  return secureHandler;
}