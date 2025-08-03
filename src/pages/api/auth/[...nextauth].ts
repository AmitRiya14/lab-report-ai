// pages/api/auth/[...nextauth].ts - Simplified approach
import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { supabaseAdmin } from "@/lib/supabase"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // Save user info to token on first sign in
      if (account && user) {
        token.userId = await ensureUserExists(user)
      }
      return token
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string
        
        // Get user data from Supabase
        try {
          const { data: userData, error } = await supabaseAdmin
            .from('users')
            .select('tier, reports_used, reset_date')
            .eq('id', token.userId)
            .single()

          if (!error && userData) {
            session.user.tier = userData.tier || "Free"
            session.user.reportsUsed = userData.reports_used || 0
            session.user.resetDate = userData.reset_date
          } else {
            session.user.tier = "Free"
            session.user.reportsUsed = 0
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
          session.user.tier = "Free"
          session.user.reportsUsed = 0
        }
      }
      return session
    },
    async signIn({ user, account }) {
      console.log("Sign in attempt:", { user: user.email, account: account?.provider })
      return true
    }
  },
  session: {
    strategy: "jwt", // Use JWT instead of database sessions
  },
  pages: {
    signIn: '/',
    error: '/',
  },
  debug: process.env.NODE_ENV === 'development',
}

// Helper function to ensure user exists in our database
async function ensureUserExists(user: any): Promise<string> {
  try {
    // Check if user already exists
    const { data: existingUser, error: selectError } = await supabaseAdmin
      .from('users')
      .select('id, tier')
      .eq('email', user.email)
      .single()

    if (existingUser) {
      // User exists, ensure they have tier data
      if (!existingUser.tier) {
        await supabaseAdmin
          .from('users')
          .update({
            tier: 'Free',
            reports_used: 0,
            reset_date: new Date().toISOString()
          })
          .eq('id', existingUser.id)
      }
      return existingUser.id
    }

    // User doesn't exist, create them
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        email: user.email,
        name: user.name,
        image: user.image,
        tier: 'Free',
        reports_used: 0,
        reset_date: new Date().toISOString(),
        email_verified: new Date().toISOString()
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Error creating user:', insertError)
      throw new Error('Failed to create user')
    }

    return newUser.id
  } catch (error) {
    console.error('Error in ensureUserExists:', error)
    throw error
  }
}

export default NextAuth(authOptions)