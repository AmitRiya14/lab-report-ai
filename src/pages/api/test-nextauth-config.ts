// pages/api/test-nextauth-config.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check all required environment variables
    const envCheck = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'Not set (using default)',
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    // Check if any required vars are missing
    const missingVars = Object.entries(envCheck)
      .filter(([, value]) => value === false)
      .map(([key]) => key);

    // Test Google OAuth configuration
    let googleConfigTest = null;
    try {
      const googleProvider = authOptions.providers.find(p => p.id === 'google');
      googleConfigTest = {
        providerFound: !!googleProvider,
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        clientIdPreview: process.env.GOOGLE_CLIENT_ID ? 
          `${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...` : null
      };
    } catch (error) {
      // Fix: Properly handle the unknown error type
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      googleConfigTest = { error: errorMessage };
    }

    // Test NextAuth session strategy
    const sessionConfig = {
      strategy: authOptions.session?.strategy || 'database',
      maxAge: authOptions.session?.maxAge || 'default',
      jwtMaxAge: authOptions.jwt?.maxAge || 'default'
    };

    return res.status(200).json({
      success: true,
      environment: envCheck,
      missingVars,
      allRequiredVarsSet: missingVars.length === 0,
      googleConfig: googleConfigTest,
      sessionConfig,
      authOptionsLoaded: !!authOptions,
      providersCount: authOptions.providers?.length || 0,
      callbacks: {
        hasJwtCallback: !!authOptions.callbacks?.jwt,
        hasSessionCallback: !!authOptions.callbacks?.session,
        hasSignInCallback: !!authOptions.callbacks?.signIn
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('NextAuth config test error:', error);
    // Fix: Properly handle the unknown error type
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ 
      error: 'Configuration test failed',
      message: errorMessage
    });
  }
}