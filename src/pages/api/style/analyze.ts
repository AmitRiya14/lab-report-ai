import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { supabaseAdmin } from '@/lib/supabase';
import { StyleAnalyzer } from '@/lib/style-analysis';
import { createSecureHandler } from '@/lib/middleware';
import { withRateLimit, RATE_LIMITS } from '@/lib/middleware/rateLimit';

async function analyzeStyleHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Get user's writing samples
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: samples } = await supabaseAdmin
      .from('user_writing_samples')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'processed');

    if (!samples || samples.length < 1) {
      return res.status(400).json({ error: 'No writing samples found' });
    }

    // Analyze style
    const styleProfile = await StyleAnalyzer.analyzeWritingSamples(samples);
    styleProfile.user_id = user.id;

    // Store/update style profile
    const { error: upsertError } = await supabaseAdmin
      .from('user_style_profiles')
      .upsert({
        ...styleProfile,
        last_updated: new Date().toISOString()
      });

    if (upsertError) {
      console.error('Style profile upsert error:', upsertError);
      return res.status(500).json({ error: 'Failed to save style profile' });
    }

    return res.status(200).json({ 
      success: true, 
      profile: styleProfile,
      samples_analyzed: samples.length
    });

  } catch (error) {
    console.error('Style analysis error:', error);
    return res.status(500).json({ error: 'Style analysis failed' });
  }
}

export default createSecureHandler(
  withRateLimit(RATE_LIMITS.GENERATE.requests, RATE_LIMITS.GENERATE.windowMs)(analyzeStyleHandler),
  { requireAuth: true }
);