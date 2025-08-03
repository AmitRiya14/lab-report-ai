// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// For server-side operations (API routes)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// For client-side operations
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Database types (you can generate these with `npx supabase gen types typescript`)
export interface User {
  id: string
  email: string
  name?: string
  image?: string
  tier: 'Free' | 'Basic' | 'Pro' | 'Plus'
  reports_used: number
  reset_date: string
  created_at: string
  updated_at: string
}

export interface Report {
  id: string
  title: string
  content: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface Account {
  id: string
  user_id: string
  type: string
  provider: string
  provider_account_id: string
  refresh_token?: string
  access_token?: string
  expires_at?: number
  token_type?: string
  scope?: string
  id_token?: string
  session_state?: string
}

export interface Session {
  id: string
  session_token: string
  user_id: string
  expires: string
}