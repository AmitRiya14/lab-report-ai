// src/lib/redis.ts
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Cache user data for performance
export const cacheUser = async (userId: string, userData: Record<string, unknown>) => {
  try {
    await redis.set(`user:${userId}`, JSON.stringify(userData), { ex: 3600 }) // 1 hour cache
  } catch (error) {
    console.warn('Redis cache set failed:', error)
  }
}

export const getCachedUser = async (userId: string) => {
  try {
    const cached = await redis.get(`user:${userId}`)
    return cached ? JSON.parse(cached as string) : null
  } catch (error) {
    console.warn('Redis cache get failed:', error)
    return null
  }
}

// Rate limiting
export const checkRateLimit = async (identifier: string, limit = 10, window = 60) => {
  try {
    const key = `rate_limit:${identifier}`
    const current = await redis.incr(key)
    
    if (current === 1) {
      await redis.expire(key, window)
    }
    
    return current <= limit
  } catch (error) {
    console.warn('Redis rate limit failed:', error)
    return true // Allow if Redis fails
  }
}

// Usage tracking cache
export const getCachedUsage = async (userId: string) => {
  try {
    const cached = await redis.get(`usage:${userId}`)
    return cached ? JSON.parse(cached as string) : null
  } catch (error) {
    console.warn('Redis usage cache failed:', error)
    return null
  }
}

export const setCachedUsage = async (userId: string, usage: Record<string, unknown>) => {
  try {
    await redis.set(`usage:${userId}`, JSON.stringify(usage), { ex: 86400 }) // 24 hour cache
  } catch (error) {
    console.warn('Redis usage cache set failed:', error)
  }
}