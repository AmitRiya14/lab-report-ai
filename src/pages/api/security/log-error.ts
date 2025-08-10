import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { createSecureHandler } from '@/lib/middleware';

async function logErrorHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { error, errorInfo, timestamp, userAgent, url } = req.body;

    // Log to Supabase security_logs table
    await supabaseAdmin
      .from('security_logs')
      .insert({
        event_type: 'CLIENT_ERROR',
        metadata: {
          error,
          errorInfo,
          userAgent,
          url,
          timestamp
        },
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        created_at: new Date().toISOString()
      });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to log security error:', error);
    res.status(500).json({ error: 'Failed to log error' });
  }
}

export default createSecureHandler(logErrorHandler, {
  requireAuth: false, // Allow unauthenticated error logging
});