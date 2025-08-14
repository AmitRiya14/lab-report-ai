// src/pages/api/auth/[...nextauth].ts - COMPLETE VERSION with all security fixes

import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { supabaseAdmin } from "@/lib/supabase"
import { createHash, randomBytes } from 'crypto';
import { securityMonitor } from '@/lib/security/monitoring';

function getClientIP(req: any): string {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] ||
         req.socket?.remoteAddress ||
         'unknown';
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  
  // Enhanced session configuration
  session: {
    strategy: "jwt",
    maxAge: 2 * 60 * 60, // 2 hours (shorter for security)
    updateAge: 15 * 60,  // Update session every 15 minutes
  },
  
  // Enhanced JWT configuration
  jwt: {
    maxAge: 2 * 60 * 60, // 2 hours
    encode: async ({ token, secret }) => {
      // Custom JWT encoding with additional security
      const jwtClaims = {
        ...token,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60), // 2 hours
        jti: randomBytes(16).toString('hex'), // Unique token ID
      };
      
      // Use Jose for JWT encoding (more secure than default)
      const { SignJWT } = await import('jose');
      const secretKey = new TextEncoder().encode(secret as string);
      
      return await new SignJWT(jwtClaims)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('2h')
        .sign(secretKey);
    },
    
    decode: async ({ token, secret }) => {
      try {
        if (!token) return null;
        
        const { jwtVerify } = await import('jose');
        const secretKey = new TextEncoder().encode(secret as string);
        
        const { payload } = await jwtVerify(token, secretKey);
        return payload;
      } catch (error) {
        console.error('JWT decode error:', error);
        return null;
      }
    }
  },

  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      try {
        // Enhanced security checks during sign-in
        if (!user.email || !user.name) {
          console.error('Missing required user data:', { user, account });
          
          await securityMonitor.logSecurityEvent({
            type: 'FAILED_LOGIN',
            severity: 'MEDIUM',
            email: user.email || 'unknown',
            metadata: {
              reason: 'MISSING_USER_DATA',
              provider: account?.provider,
              hasEmail: !!user.email,
              hasName: !!user.name,
              timestamp: new Date().toISOString()
            }
          });
          
          return false;
        }

        // 🔒 NEW: Check if account is locked before allowing sign-in
        const { data: userRecord } = await supabaseAdmin
          .from('users')
          .select('is_active, locked_until, failed_login_count')
          .eq('email', user.email)
          .single();

        if (userRecord) {
          // Check if account is locked
          if (!userRecord.is_active) {
            await securityMonitor.logSecurityEvent({
              type: 'UNAUTHORIZED_ACCESS',
              severity: 'HIGH',
              email: user.email,
              metadata: {
                reason: 'ACCOUNT_DEACTIVATED',
                provider: account?.provider,
                timestamp: new Date().toISOString()
              }
            });
            return false;
          }

          // Check if account is temporarily locked
          if (userRecord.locked_until && new Date(userRecord.locked_until) > new Date()) {
            await securityMonitor.logSecurityEvent({
              type: 'UNAUTHORIZED_ACCESS',
              severity: 'HIGH',
              email: user.email,
              metadata: {
                reason: 'ACCOUNT_TEMPORARILY_LOCKED',
                lockedUntil: userRecord.locked_until,
                provider: account?.provider,
                timestamp: new Date().toISOString()
              }
            });
            return false;
          }

          // 🔒 NEW: Reset failed login count on successful login
          if (userRecord.failed_login_count > 0) {
            await supabaseAdmin
              .from('users')
              .update({
                failed_login_count: 0,
                locked_until: null,
                updated_at: new Date().toISOString()
              })
              .eq('email', user.email);
          }
        }

        // Check for suspicious sign-in patterns
        const isLegitimate = await validateSignInAttempt(user.email, account?.provider);
        if (!isLegitimate) {
          console.error('Suspicious sign-in attempt blocked:', user.email);
          
          await securityMonitor.logSecurityEvent({
            type: 'SUSPICIOUS_ACTIVITY',
            severity: 'HIGH',
            email: user.email,
            metadata: {
              reason: 'SUSPICIOUS_SIGNIN_PATTERN',
              provider: account?.provider,
              timestamp: new Date().toISOString()
            }
          });
          
          return false;
        }

        // Rate limit sign-in attempts per email
        const signInAllowed = await checkSignInRateLimit(user.email);
        if (!signInAllowed) {
          console.error('Sign-in rate limit exceeded:', user.email);
          
          await securityMonitor.logSecurityEvent({
            type: 'RATE_LIMIT_EXCEEDED',
            severity: 'MEDIUM',
            email: user.email,
            metadata: {
              reason: 'SIGNIN_RATE_LIMIT',
              provider: account?.provider,
              timestamp: new Date().toISOString()
            }
          });
          
          return false;
        }

        const userId = await ensureUserExists(user);
        if (!userId) {
          console.error('Failed to create/find user:', user.email);
          
          await securityMonitor.logSecurityEvent({
            type: 'FAILED_LOGIN',
            severity: 'HIGH',
            email: user.email,
            metadata: {
              reason: 'USER_CREATION_FAILED',
              provider: account?.provider,
              timestamp: new Date().toISOString()
            }
          });
          
          return false;
        }

        // Log successful login
        await securityMonitor.logSecurityEvent({
          type: 'SUCCESSFUL_LOGIN',
          severity: 'LOW',
          userId: userId,
          email: user.email,
          metadata: {
            provider: account?.provider,
            isNewUser: !userId,
            timestamp: new Date().toISOString()
          }
        });

        return true;
      } catch (error) {
        console.error('Sign-in callback error:', error);
        
        await securityMonitor.logSecurityEvent({
          type: 'FAILED_LOGIN',
          severity: 'HIGH',
          email: user.email || 'unknown',
          metadata: {
            reason: 'SYSTEM_ERROR',
            error: error instanceof Error ? error.message : 'Unknown error',
            provider: account?.provider,
            timestamp: new Date().toISOString()
          }
        });
        
        return false;
      }
    },

    async jwt({ token, account, user, trigger }) {
      // Enhanced JWT handling with security checks
      if (trigger === 'signIn' && user) {
        const userRecord = await getUserByEmail(user.email!);
        if (!userRecord) {
          throw new Error('User not found after sign-in');
        }

        token.userId = userRecord.id;
        token.tier = userRecord.tier;
        token.sessionId = randomBytes(16).toString('hex');
        
        // Store session in database for tracking
        await createSecureSession(userRecord.id, token.sessionId as string);
      }

      // Validate session on each request
      if (token.userId && token.sessionId) {
        const isValidSession = await validateSession(
          token.userId as string, 
          token.sessionId as string
        );
        if (!isValidSession) {
          console.warn('Invalid session detected, forcing re-auth');
          return {}; // Force re-authentication
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token.userId) {
        try {
          // Get fresh user data on each session
          const userData = await supabaseAdmin
            .from('users')
            .select('id, tier, reports_used, reset_date, is_active, last_activity, locked_until')
            .eq('id', token.userId)
            .single();

          if (userData.error || !userData.data) {
            console.error('User data not found');
            
            await securityMonitor.logSecurityEvent({
              type: 'SUSPICIOUS_ACTIVITY',
              severity: 'HIGH',
              userId: token.userId as string,
              email: session.user?.email || 'unknown',
              metadata: {
                reason: 'USER_DATA_NOT_FOUND',
                sessionId: token.sessionId,
                timestamp: new Date().toISOString()
              }
            });
            
            return { ...session, user: { ...session.user, id: '', tier: 'Free', reportsUsed: 0 } };
          }

          // 🔒 NEW: Check if account is still active during session
          if (!userData.data.is_active || 
              (userData.data.locked_until && new Date(userData.data.locked_until) > new Date())) {
            console.error('Account deactivated or locked during session');
            
            await securityMonitor.logSecurityEvent({
              type: 'UNAUTHORIZED_ACCESS',
              severity: 'HIGH',
              userId: userData.data.id,
              email: session.user?.email || 'unknown',
              metadata: {
                reason: 'ACCOUNT_LOCKED_DURING_SESSION',
                sessionId: token.sessionId,
                timestamp: new Date().toISOString()
              }
            });
            
            return { ...session, user: { ...session.user, id: '', tier: 'Free', reportsUsed: 0 } };
          }

          // Update last activity
          await supabaseAdmin
            .from('users')
            .update({ last_activity: new Date().toISOString() })
            .eq('id', token.userId);

          session.user.id = userData.data.id;
          session.user.tier = userData.data.tier;
          session.user.reportsUsed = userData.data.reports_used;
          session.user.resetDate = userData.data.reset_date;
        } catch (error) {
          console.error('Session callback error:', error);
          
          await securityMonitor.logSecurityEvent({
            type: 'SUSPICIOUS_ACTIVITY',
            severity: 'MEDIUM',
            userId: token.userId as string,
            email: session.user?.email || 'unknown',
            metadata: {
              reason: 'SESSION_CALLBACK_ERROR',
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString()
            }
          });
          
          return { ...session, user: { ...session.user, id: '', tier: 'Free', reportsUsed: 0 } };
        }
      }

      return session;
    }
  },

  // Security events logging
  events: {
    async signIn(message) {
      console.log('Sign-in event:', {
        user: message.user.email,
        timestamp: new Date().toISOString(),
        account: message.account?.provider
      });
      
      // Log to security audit table
      await logSecurityEvent('SIGN_IN', {
        userId: message.user.id || '',
        email: message.user.email || '',
        provider: message.account?.provider || '',
        ip: message.account?.providerAccountId || ''
      });
    },

    async signOut(message) {
      console.log('Sign-out event:', {
        user: message.token?.email,
        timestamp: new Date().toISOString()
      });

      if (message.token?.email) {
        await securityMonitor.logSecurityEvent({
          type: 'SUCCESSFUL_LOGIN',
          severity: 'LOW',
          userId: message.token.userId as string,
          email: message.token.email as string,
          metadata: {
            action: 'SIGN_OUT',
            sessionId: message.token.sessionId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Invalidate session in database
      if (message.token?.userId && message.token?.sessionId) {
        await invalidateSession(
          message.token.userId as string, 
          message.token.sessionId as string
        );
      }
    },

    async session(message) {
      // Update session activity
      if (message.session?.user?.id) {
        await updateSessionActivity(message.session.user.id);
      }
    }
  },

  // Enhanced security configuration
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' ? process.env.NEXTAUTH_URL?.split('//')[1] : undefined
      }
    },
    callbackUrl: {
      name: `__Secure-next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    csrfToken: {
      name: `__Host-next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },

  debug: false, // Never enable in production
};

// ========================================
// SECURITY HELPER FUNCTIONS
// ========================================

async function validateSignInAttempt(email: string, provider?: string): Promise<boolean> {
  try {
    // Check for recent failed attempts
    const { data: failedAttempts } = await supabaseAdmin
      .from('security_logs')
      .select('*')
      .eq('event_type', 'FAILED_SIGN_IN')
      .eq('email', email)
      .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (failedAttempts && failedAttempts.length >= 5) {
      return false; // Too many recent failed attempts
    }

    // Check for suspicious provider switching
    if (provider) {
      const { data: recentSignIns } = await supabaseAdmin
        .from('security_logs')
        .select('metadata')
        .eq('event_type', 'SIGN_IN')
        .eq('email', email)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(5);

      if (recentSignIns && recentSignIns.length > 0) {
        const providers = recentSignIns.map(log => log.metadata?.provider).filter(Boolean);
        if (providers.length > 0 && !providers.includes(provider)) {
          // Log suspicious provider change
          await logSecurityEvent('SUSPICIOUS_PROVIDER_CHANGE', {
            email,
            oldProvider: providers[0],
            newProvider: provider
          });
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Sign-in validation error:', error);
    return true; // Allow sign-in if validation fails
  }
}

async function checkSignInRateLimit(email: string): Promise<boolean> {
  try {
    const { data: attempts } = await supabaseAdmin
      .from('security_logs')
      .select('*')
      .eq('email', email)
      .in('event_type', ['SIGN_IN', 'FAILED_SIGN_IN'])
      .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());

    return !attempts || attempts.length < 10; // Max 10 attempts per 15 minutes
  } catch (error) {
    console.error('Rate limit check error:', error);
    return true; // Allow if check fails
  }
}

async function createSecureSession(userId: string, sessionId: string): Promise<void> {
  try {
    await supabaseAdmin
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_id: sessionId,
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        is_active: true
      });
  } catch (error) {
    console.error('Session creation error:', error);
  }
}

async function validateSession(userId: string, sessionId: string): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .single();

    return !!data;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
}

async function invalidateSession(userId: string, sessionId: string): Promise<void> {
  try {
    await supabaseAdmin
      .from('user_sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('session_id', sessionId);
  } catch (error) {
    console.error('Session invalidation error:', error);
  }
}

async function updateSessionActivity(userId: string): Promise<void> {
  try {
    await supabaseAdmin
      .from('user_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_active', true);
  } catch (error) {
    console.error('Session activity update error:', error);
  }
}

async function logSecurityEvent(eventType: string, metadata: any): Promise<void> {
  try {
    await supabaseAdmin
      .from('security_logs')
      .insert({
        event_type: eventType,
        metadata,
        created_at: new Date().toISOString(),
        email: metadata.email,
        user_id: metadata.userId,
        ip_address: metadata.ip
      });
  } catch (error) {
    console.error('Security logging error:', error);
  }
}

async function ensureUserExists(user: any): Promise<string | null> {
  try {
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, tier, is_active')
      .eq('email', user.email)
      .single();

    if (existingUser) {
      // Check if account is active
      if (!existingUser.is_active) {
        await logSecurityEvent('INACTIVE_ACCOUNT_ACCESS', {
          email: user.email,
          userId: existingUser.id
        });
        return null;
      }

      return existingUser.id;
    }

    // Create new user with security defaults
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert({
        email: user.email,
        name: user.name,
        image: user.image,
        tier: 'Free',
        reports_used: 0,
        reset_date: new Date().toISOString(),
        is_active: true,
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('User creation error:', error);
      return null;
    }

    await logSecurityEvent('USER_CREATED', {
      email: user.email,
      userId: newUser.id
    });

    return newUser.id;
  } catch (error) {
    console.error('Error in ensureUserExists:', error);
    return null;
  }
}

async function getUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) return null;
  return data;
}

export default NextAuth(authOptions);