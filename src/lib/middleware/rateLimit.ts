import { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { securityMonitor } from '@/lib/security/monitoring';

interface RateLimitConfig {
  requests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextApiRequest) => string;
  onLimitReached?: (req: NextApiRequest, res: NextApiResponse) => void;
}

function getClientIP(req: NextApiRequest): string {
  return (req.headers['x-forwarded-for'] as string) ||
         (req.headers['x-real-ip'] as string) ||
         req.socket.remoteAddress ||
         'unknown';
}

export class RateLimiter {
  private redis: Redis | null = null;
  private memoryStore: Map<string, { count: number; resetTime: number }> = new Map();
  private useRedis: boolean;

  constructor() {
    this.useRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
    
    if (this.useRedis) {
      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
    }

    // Clean up memory store every 5 minutes
    if (!this.useRedis) {
      setInterval(() => this.cleanupMemoryStore(), 5 * 60 * 1000);
    }
  }

  async checkLimit(key: string, config: RateLimitConfig): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    total: number;
  }> {
    const now = Date.now();

    if (this.useRedis && this.redis) {
      return this.checkRedisLimit(key, config, now);
    } else {
      return this.checkMemoryLimit(key, config, now);
    }
  }

  private async checkRedisLimit(key: string, config: RateLimitConfig, now: number) {
    const windowStart = now - config.windowMs;
    
    try {
      const pipeline = this.redis!.pipeline();
      
      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      
      // Count current requests
      pipeline.zcard(key);
      
      // Add current request - FIXED FORMAT
      pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` });
      
      // Set expiration
      pipeline.expire(key, Math.ceil(config.windowMs / 1000));
      
      const results = await pipeline.exec();
      const currentCount = (results[1] as number) || 0;
      
      const allowed = currentCount < config.requests;
      const remaining = Math.max(0, config.requests - currentCount - 1);
      const resetTime = now + config.windowMs;

      return {
        allowed,
        remaining,
        resetTime,
        total: config.requests
      };
    } catch (error) {
      console.warn('Redis rate limit failed, falling back to memory:', error);
      return this.checkMemoryLimit(key, config, now);
    }
  }

  private checkMemoryLimit(key: string, config: RateLimitConfig, now: number) {
    const entry = this.memoryStore.get(key);
    
    if (!entry || entry.resetTime <= now) {
      // New window
      const resetTime = now + config.windowMs;
      this.memoryStore.set(key, { count: 1, resetTime });
      
      return {
        allowed: true,
        remaining: config.requests - 1,
        resetTime,
        total: config.requests
      };
    } else {
      // Existing window
      entry.count++;
      const allowed = entry.count <= config.requests;
      const remaining = Math.max(0, config.requests - entry.count);
      
      return {
        allowed,
        remaining,
        resetTime: entry.resetTime,
        total: config.requests
      };
    }
  }

  private cleanupMemoryStore() {
    const now = Date.now();
    for (const [key, entry] of this.memoryStore.entries()) {
      if (entry.resetTime <= now) {
        this.memoryStore.delete(key);
      }
    }
  }
}

const rateLimiter = new RateLimiter();

// Different rate limits for different endpoints
export const RATE_LIMITS = {
  // File upload - very restrictive
  UPLOAD: { requests: 5, windowMs: 15 * 60 * 1000 }, // 5 uploads per 15 minutes
  
  // AI generation - moderate
  GENERATE: { requests: 20, windowMs: 60 * 60 * 1000 }, // 20 generations per hour
  
  // Authentication - strict
  AUTH: { requests: 5, windowMs: 15 * 60 * 1000 }, // 5 auth attempts per 15 minutes
  
  // General API - lenient
  GENERAL: { requests: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
} as const;

export const withRateLimit = (
  requests: number, 
  windowMs: number, 
  options: Partial<RateLimitConfig> = {}
) => {
  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      try {
        const config: RateLimitConfig = {
          requests,
          windowMs,
          keyGenerator: (req) => {
            // Use user ID if authenticated, otherwise IP
            const userId = req.headers['x-user-id'] as string;
            const ip = getClientIP(req);
            return userId ? `user:${userId}` : `ip:${ip}`;
          },
          ...options
        };

        const key = config.keyGenerator!(req);
        const result = await rateLimiter.checkLimit(key, config);

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', config.requests);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

        if (!result.allowed) {
          res.setHeader('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000));
          
          const ip = getClientIP(req);
          
          // ✅ LOG RATE LIMIT VIOLATION WITH SECURITY MONITORING
          await securityMonitor.logSecurityEvent({
            type: 'RATE_LIMIT_EXCEEDED',
            severity: 'MEDIUM',
            ipAddress: ip,
            userAgent: req.headers['user-agent'] as string,
            metadata: {
              endpoint: req.url,
              method: req.method,
              remaining: result.remaining,
              limit: config.requests,
              key: key,
              timestamp: new Date().toISOString()
            }
          });
          
          // Log rate limit violation
          console.warn(`Rate limit exceeded for ${key}`, {
            endpoint: req.url,
            method: req.method,
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString()
          });
          
          if (config.onLimitReached) {
            config.onLimitReached(req, res);
          } else {
            return res.status(429).json({
              error: 'Too many requests',
              message: `Rate limit exceeded. Try again in ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`,
              retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
            });
          }
          return;
        }

        return handler(req, res);
      } catch (error) {
        console.error('Rate limiting error:', error);
        // Don't block request if rate limiting fails
        return handler(req, res);
      }
    };
  };
};

// DDoS Protection
const requestCounts = new Map<string, { count: number; firstRequest: number }>();
const SUSPICIOUS_THRESHOLD = 50; // requests per minute
const BAN_DURATION = 15 * 60 * 1000; // 15 minutes
const bannedIPs = new Map<string, number>();

export const withDDoSProtection = () => {
  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const ip = getClientIP(req);
      const now = Date.now();

      // Check if IP is banned
      const banExpiry = bannedIPs.get(ip);
      if (banExpiry && now < banExpiry) {
        console.warn(`Blocked request from banned IP: ${ip}`);
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'Your IP has been temporarily banned due to suspicious activity'
        });
      }

      // Clean up expired bans
      if (banExpiry && now >= banExpiry) {
        bannedIPs.delete(ip);
      }

      // Track request rate
      const current = requestCounts.get(ip);
      if (!current) {
        requestCounts.set(ip, { count: 1, firstRequest: now });
      } else {
        const timeWindow = now - current.firstRequest;
        
        if (timeWindow < 60000) { // Within 1 minute window
          current.count++;
          
          if (current.count > SUSPICIOUS_THRESHOLD) {
            // Ban the IP
            bannedIPs.set(ip, now + BAN_DURATION);
            requestCounts.delete(ip);
            
            console.error(`IP banned for DDoS: ${ip}, ${current.count} requests in ${timeWindow}ms`);
            
            // ✅ LOG DDOS ATTACK
            await securityMonitor.logSecurityEvent({
              type: 'SUSPICIOUS_ACTIVITY',
              severity: 'CRITICAL',
              ipAddress: ip,
              userAgent: req.headers['user-agent'] as string,
              metadata: {
                pattern: 'DDOS_ATTACK',
                requestCount: current.count,
                timeWindow: timeWindow,
                endpoint: req.url,
                banned: true,
                timestamp: new Date().toISOString()
              }
            });
            
            return res.status(429).json({
              error: 'Too many requests',
              message: 'Your IP has been temporarily banned due to excessive requests'
            });
          }
        } else {
          // Reset counter for new window
          requestCounts.set(ip, { count: 1, firstRequest: now });
        }
      }

      // Clean up old entries
      for (const [key, value] of requestCounts.entries()) {
        if (now - value.firstRequest > 60000) {
          requestCounts.delete(key);
        }
      }

      return handler(req, res);
    };
  };
};