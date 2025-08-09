// CREATE: src/lib/server/env-validation.ts
import { z } from 'zod';

const envSchema = z.object({
  CLAUDE_API_KEY: z.string().min(1, 'Claude API key is required'),
  NEXTAUTH_SECRET: z.string().min(32, 'NextAuth secret must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url('NextAuth URL must be a valid URL'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'Google Client ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'Google Client Secret is required'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Supabase URL must be valid'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service key is required'),
  STRIPE_SECRET_KEY: z.string().min(1, 'Stripe secret key is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'Stripe webhook secret is required'),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    process.exit(1);
  }
}

// Call this at app startup
if (typeof window === 'undefined') {
  validateEnv();
}