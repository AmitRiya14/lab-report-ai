import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// ✅ ADD THIS TYPE DECLARATION
declare global {
  var rateLimitStore: Map<string, number[]> | undefined;
}

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') || 
         request.headers.get('x-real-ip') || 
         request.headers.get('cf-connecting-ip') || // Cloudflare
         'unknown';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();
  
  // 1. Security Headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // 2. Content Security Policy
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' https://js.stripe.com https://checkout.stripe.com https://cdnjs.cloudflare.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: blob: https://*.googleusercontent.com;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://api.anthropic.com https://api.stripe.com ${process.env.NEXT_PUBLIC_SUPABASE_URL || ''};
    frame-src https://js.stripe.com https://checkout.stripe.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    ${process.env.NODE_ENV === 'production' ? 'upgrade-insecure-requests;' : ''}
  `.replace(/\s+/g, ' ').trim();
  
  response.headers.set('Content-Security-Policy', csp);

  // 3. Rate Limiting for sensitive paths
  if (pathname.startsWith('/api/')) {
    const ip = getClientIP(request);
    const rateLimitResult = await checkGlobalRateLimit(ip, pathname);
    
    if (!rateLimitResult.allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        }
      );
    }
  }

  // 4. Authentication Protection
  if (pathname.startsWith('/report') || pathname.startsWith('/dashboard')) {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('error', 'auth_required');
      return NextResponse.redirect(url);
    }

    // Check session validity
    const isValidSession = await validateSessionToken(token);
    if (!isValidSession) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('error', 'session_invalid');
      return NextResponse.redirect(url);
    }
  }

  // 5. Admin Path Protection
  if (pathname.startsWith('/admin')) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const isAdmin = token?.email?.endsWith('@gradelylabs.com');
    
    if (!isAdmin) {
      return new NextResponse('Access Denied', { status: 403 });
    }
  }

  // 6. Block suspicious paths
  const suspiciousPaths = [
    '/.env',
    '/config',
    '/admin',
    '/.git',
    '/wp-admin',
    '/phpmyadmin',
    '/xmlrpc.php',
    '/.well-known/security.txt'
  ];

  if (suspiciousPaths.some(path => pathname.startsWith(path))) {
    // Log security event
    const ip = getClientIP(request);
    console.warn(`Blocked suspicious path access: ${pathname} from IP: ${ip}`);
    return new NextResponse('Not Found', { status: 404 });
  }

  // 7. File Upload Path Security
  if (pathname.startsWith('/api/upload')) {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 25 * 1024 * 1024) {
      return new NextResponse('Payload too large', { status: 413 });
    }
  }

  return response;
}

// Global rate limiting function
async function checkGlobalRateLimit(
  ip: string, 
  pathname: string
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `rate_limit:${ip}:${pathname}`;
  
  // Different limits for different endpoints
  const limits = {
    '/api/upload': { requests: 10, window: 60000 }, // 10 per minute
    '/api/auth': { requests: 5, window: 300000 }, // 5 per 5 minutes
    '/api/': { requests: 100, window: 60000 }, // 100 per minute general
  };

  const limit = Object.entries(limits).find(([path]) => 
    pathname.startsWith(path)
  )?.[1] || { requests: 60, window: 60000 };

  // ✅ FIXED: Use proper global declaration
  if (!global.rateLimitStore) {
    global.rateLimitStore = new Map();
  }

  const now = Date.now();
  const windowStart = now - limit.window;
  
  const current = global.rateLimitStore.get(key) || [];
  const validRequests = current.filter((time: number) => time > windowStart);
  
  if (validRequests.length >= limit.requests) {
    return { allowed: false, remaining: 0 };
  }

  validRequests.push(now);
  global.rateLimitStore.set(key, validRequests);

  return { 
    allowed: true, 
    remaining: limit.requests - validRequests.length 
  };
}

async function validateSessionToken(token: any): Promise<boolean> {
  try {
    // Check token expiration
    if (!token.exp || token.exp < Date.now() / 1000) {
      return false;
    }

    // Additional session validation logic
    if (token.userId && token.sessionId) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};