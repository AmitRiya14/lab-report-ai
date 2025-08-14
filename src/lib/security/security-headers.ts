
// ========================================
// src/lib/security/security-headers.ts - ENHANCED VERSION
// ========================================

import { NextApiRequest, NextApiResponse } from 'next';

export const withSecurityHeaders = () => {
  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      // 1. HSTS - Force HTTPS for 1 year
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );

      // 2. Content Type Options - Prevent MIME sniffing
      res.setHeader('X-Content-Type-Options', 'nosniff');

      // 3. Frame Options - Prevent clickjacking
      res.setHeader('X-Frame-Options', 'DENY');

      // 4. XSS Protection
      res.setHeader('X-XSS-Protection', '1; mode=block');

      // 5. Referrer Policy - Limit referrer information
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

      // 6. Permissions Policy - Restrict browser features
      res.setHeader(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), magnetometer=(), gyroscope=(), speaker=()'
      );

      // 7. Content Security Policy - Comprehensive CSP
      const csp = buildCSP(req);
      res.setHeader('Content-Security-Policy', csp);

      // 8. Cross-Origin Resource Policy
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

      // 9. Cross-Origin Opener Policy
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

      // 10. Cross-Origin Embedder Policy
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

      // 11. Remove server information
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');

      // 12. Cache Control for sensitive endpoints
      if (req.url?.startsWith('/api/auth') || req.url?.includes('sensitive')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }

      // 13. CORS headers for API routes
      if (req.url?.startsWith('/api/')) {
        const allowedOrigins = [
          process.env.NEXTAUTH_URL || 'http://localhost:3000',
          'https://your-production-domain.com'
        ];
        
        const origin = req.headers.origin;
        if (origin && allowedOrigins.includes(origin)) {
          res.setHeader('Access-Control-Allow-Origin', origin);
        }
        
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader(
          'Access-Control-Allow-Methods',
          'GET, POST, PUT, DELETE, OPTIONS'
        );
        res.setHeader(
          'Access-Control-Allow-Headers',
          'Content-Type, Authorization, X-Requested-With, X-CSRF-Token'
        );
        res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
      }

      return handler(req, res);
    };
  };
};

function buildCSP(req: NextApiRequest): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const nonce = generateNonce();
  
  const cspDirectives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      ...(isProduction ? [] : ["'unsafe-eval'"]),
      "'nonce-" + nonce + "'",
      'https://js.stripe.com',
      'https://checkout.stripe.com',
      'https://cdnjs.cloudflare.com',
      ...(process.env.NODE_ENV === 'development' ? ["'unsafe-inline'"] : [])
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'",
      'https://fonts.googleapis.com'
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https://*.googleusercontent.com',
      'https://lh3.googleusercontent.com',
      'https://via.placeholder.com'
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com'
    ],
    'connect-src': [
      "'self'",
      'https://api.anthropic.com',
      'https://api.stripe.com',
      'https://checkout.stripe.com',
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL ? [process.env.NEXT_PUBLIC_SUPABASE_URL] : []),
      ...(process.env.UPSTASH_REDIS_REST_URL ? [process.env.UPSTASH_REDIS_REST_URL] : []),
      ...(process.env.CSP_REPORT_URI ? [] : []) // Add report-uri if configured
    ],
    'frame-src': [
      'https://js.stripe.com',
      'https://checkout.stripe.com'
    ],
    'worker-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'embed-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    ...(isProduction ? { 'upgrade-insecure-requests': [] } : {}),
    'block-all-mixed-content': [],
    ...(process.env.CSP_REPORT_URI ? { 'report-uri': [process.env.CSP_REPORT_URI] } : {})
  };

  return Object.entries(cspDirectives)
    .map(([directive, sources]) => 
      sources.length > 0 
        ? `${directive} ${sources.join(' ')}` 
        : directive
    )
    .join('; ');
}

function generateNonce(): string {
  return Buffer.from(Math.random().toString()).toString('base64').slice(0, 16);
}