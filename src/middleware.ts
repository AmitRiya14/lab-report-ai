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

  // 🔒 NEW: Restrict access to security endpoints
  if (pathname.startsWith('/api/security/')) {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    // Only allow admin users to access security endpoints
    const isAdmin = token?.email?.endsWith('@gradelylabs.com') || 
                   token?.email === 'admin@gradelylabs.com' ||
                   token?.email === 'security@gradelylabs.com';
    
    if (!isAdmin) {
      console.warn(`🔒 Blocked non-admin access to security endpoint: ${pathname} from ${getClientIP(request)}`);
      return new NextResponse('Access Denied', { status: 403 });
    }
  }

  // 🔒 NEW: Block direct access to deprecated security views
  if (pathname.startsWith('/api/') && request.url.includes('security_dashboard')) {
    console.warn(`Blocked access to deprecated security_dashboard from IP: ${getClientIP(request)}`);
    return new NextResponse('Endpoint Deprecated', { status: 410 });
  }

  // 🔒 NEW: Enhanced admin dashboard protection
  if (pathname.startsWith('/admin')) {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    const isAdmin = token?.email?.endsWith('@gradelylabs.com') || 
                   token?.email === 'admin@gradelylabs.com' ||
                   token?.email === 'security@gradelylabs.com';
    
    if (!isAdmin) {
      console.warn(`🔒 Blocked non-admin access to admin area: ${pathname} from ${getClientIP(request)}`);
      
      // Log security incident
      const ip = getClientIP(request);
      const userAgent = request.headers.get('user-agent') || '';
      
      // Could add security logging here if needed
      console.error('SECURITY: Unauthorized admin access attempt', {
        ip,
        userAgent,
        pathname,
        userEmail: token?.email || 'unauthenticated',
        timestamp: new Date().toISOString()
      });
      
      return new NextResponse('Access Denied', { status: 403 });
    }
  }

  // 3. Rate Limiting for sensitive paths
  if (pathname.startsWith('/api/')) {
    const ip = getClientIP(request);
    const rateLimitResult = await checkGlobalRateLimit(ip, pathname);
    
    if (!rateLimitResult.allowed) {
      console.warn(`🔒 Rate limit exceeded for ${ip} on ${pathname}`);
      return new NextResponse(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          retryAfter: 60,
          message: 'Too many requests. Please wait and try again.'
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': (Math.ceil(Date.now() / 1000) + 60).toString()
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

  // 5. Block suspicious paths
  const suspiciousPaths = [
    '/.env',
    '/config',
    '/.git',
    '/wp-admin',
    '/phpmyadmin',
    '/xmlrpc.php',
    '/.well-known/security.txt',
    '/admin.php',
    '/admin/',
    '/administrator',
    '/wp-login.php',
    '/wp-config.php'
  ];

  if (suspiciousPaths.some(path => pathname.startsWith(path))) {
    // Log security event
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    
    console.warn(`🔒 Blocked suspicious path access: ${pathname} from IP: ${ip}`);
    
    // Log detailed security incident
    console.error('SECURITY: Suspicious path access attempt', {
      ip,
      userAgent,
      pathname,
      timestamp: new Date().toISOString(),
      referer: request.headers.get('referer') || '',
      method: request.method
    });
    
    return new NextResponse('Not Found', { status: 404 });
  }

  // 🔒 NEW: Enhanced file upload path security
  if (pathname.startsWith('/api/upload')) {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 25 * 1024 * 1024) {
      console.warn(`🔒 Blocked oversized upload: ${contentLength} bytes from ${getClientIP(request)}`);
      return new NextResponse('Payload too large', { status: 413 });
    }

    // Check for suspicious file upload patterns
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('executable') || contentType.includes('script')) {
      console.warn(`🔒 Blocked suspicious content type: ${contentType} from ${getClientIP(request)}`);
      return new NextResponse('Invalid file type', { status: 400 });
    }
  }

  // 🔒 NEW: Monitor for potential CSRF attacks
  if (request.method === 'POST' && pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const expectedOrigin = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    if (origin && !origin.includes(expectedOrigin.replace(/https?:\/\//, ''))) {
      console.warn(`🔒 Potential CSRF attack blocked: origin ${origin} for ${pathname}`);
      return new NextResponse('Invalid origin', { status: 403 });
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
    '/api/security/': { requests: 20, window: 60000 }, // 20 per minute for security endpoints
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