// types/next-auth.d.ts
import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string
      image?: string
      tier: 'Free' | 'Basic' | 'Pro' | 'Plus'
      reportsUsed: number
      resetDate?: string
    }
  }

  interface User {
    id: string
    email: string
    name?: string
    image?: string
    tier?: 'Free' | 'Basic' | 'Pro' | 'Plus'
    reportsUsed?: number
    resetDate?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string
  }
}