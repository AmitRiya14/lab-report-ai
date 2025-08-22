// src/pages/api/health.ts - System health check
import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimiterHealth } from '@/lib/middleware/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {} as Record<string, any>,
    environment: process.env.NODE_ENV || 'development'
  };

  try {
    // 1. Check Supabase connection
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id')
        .limit(1);
      
      checks.services.supabase = {
        status: error ? 'error' : 'healthy',
        error: error?.message || null,
        connected: !error
      };
    } catch (err) {
      checks.services.supabase = {
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
        connected: false
      };
    }

    // 2. Check rate limiter health
    try {
      const rateLimiterHealth = await checkRateLimiterHealth();
      checks.services.rateLimiter = {
        status: 'healthy',
        redis: rateLimiterHealth.redis,
        memory: rateLimiterHealth.memory,
        redisConnectionFailed: rateLimiterHealth.redisConnectionFailed,
        fallbackMode: rateLimiterHealth.redisConnectionFailed ? 'memory' : 'redis'
      };
    } catch (err) {
      checks.services.rateLimiter = {
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // 3. Check environment variables
    const requiredEnvVars = [
      'NEXTAUTH_SECRET',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'CLAUDE_API_KEY'
    ];

    const optionalEnvVars = [
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET'
    ];

    checks.services.environment = {
      status: 'healthy',
      required: {} as Record<string, boolean>,
      optional: {} as Record<string, boolean>
    };

    // Check required env vars
    for (const envVar of requiredEnvVars) {
      const exists = !!process.env[envVar];
      checks.services.environment.required[envVar] = exists;
      if (!exists) {
        checks.services.environment.status = 'warning';
        checks.status = 'degraded';
      }
    }

    // Check optional env vars
    for (const envVar of optionalEnvVars) {
      checks.services.environment.optional[envVar] = !!process.env[envVar];
    }

    // 4. Check NextAuth configuration
    checks.services.nextauth = {
      status: 'healthy',
      url: process.env.NEXTAUTH_URL || 'not-set',
      hasSecret: !!process.env.NEXTAUTH_SECRET,
      hasGoogleConfig: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    };

    // 5. System info
    checks.services.system = {
      status: 'healthy',
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };

    // Overall status determination
    const hasErrors = Object.values(checks.services).some(
      service => service.status === 'error'
    );
    
    if (hasErrors) {
      checks.status = 'unhealthy';
    }

    // Return appropriate status code
    const statusCode = checks.status === 'unhealthy' ? 503 : 
                      checks.status === 'degraded' ? 200 : 200;

    return res.status(statusCode).json(checks);

  } catch (error) {
    console.error('Health check error:', error);
    return res.status(503).json({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      services: checks.services
    });
  }
}