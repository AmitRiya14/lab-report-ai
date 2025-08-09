// pages/api/track-usage.ts - Supabase version
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import { supabaseAdmin } from '@/lib/supabase';
import { getCachedUser, cacheUser, checkRateLimit } from '../../lib/redis';
import { withRateLimit, RATE_LIMITS } from "@/lib/middleware/rateLimit";

async function trackUsageHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Rate limiting per user
    const canProceed = await checkRateLimit(`usage:${session.user.email}`, 5, 60); // 5 requests per minute
    if (!canProceed) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    // Try to get user from cache first
    let user = await getCachedUser(session.user.email);
    
    if (!user) {
      // If not in cache, fetch from Supabase
      const { data: userData, error } = await supabaseAdmin
        .from('users')
        .select('id, email, tier, reports_used, reset_date')
        .eq('email', session.user.email)
        .single();

      if (error || !userData) {
        console.error('User fetch error:', error);
        return res.status(404).json({ error: 'User not found' });
      }

      user = userData;
      // Cache the user data
      await cacheUser(session.user.email, user);
    }

    // Check usage limits
    const now = new Date();
    const resetDate = new Date(user.reset_date);
    const shouldReset = now.getMonth() !== resetDate.getMonth() || 
                       now.getFullYear() !== resetDate.getFullYear();

    const limits = { Free: 3, Basic: 15, Pro: 50, Plus: 999 };
    const userLimit = limits[user.tier as keyof typeof limits] || 3;
    const currentUsage = shouldReset ? 0 : user.reports_used;

    if (currentUsage >= userLimit && user.tier !== 'Plus') {
      return res.status(429).json({ 
        error: 'Usage limit exceeded',
        currentUsage,
        limit: userLimit,
        tier: user.tier
      });
    }

    // Update user usage
    const newUsage = shouldReset ? 1 : currentUsage + 1;
    const newResetDate = shouldReset ? now.toISOString() : user.reset_date;

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        reports_used: newUsage,
        reset_date: newResetDate,
        updated_at: now.toISOString()
      })
      .eq('id', user.id)
      .select('id, reports_used, tier')
      .single();

    if (updateError) {
      console.error('User update error:', updateError);
      return res.status(500).json({ error: 'Failed to update usage' });
    }

    // Create report record if data provided
    if (req.body.title && req.body.content) {
      const { error: reportError } = await supabaseAdmin
        .from('reports')
        .insert({
          title: req.body.title,
          content: req.body.content,
          user_id: user.id,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        });

      if (reportError) {
        console.error('Report creation error:', reportError);
        // Don't fail the entire request if report creation fails
      }
    }

    // Update cache
    await cacheUser(session.user.email, { 
      ...user, 
      reports_used: newUsage, 
      reset_date: newResetDate 
    });

    return res.status(200).json({
      success: true,
      usage: {
        current: updatedUser.reports_used,
        limit: userLimit,
        tier: updatedUser.tier
      }
    });

  } catch (error) {
    console.error('Usage tracking error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Apply advanced rate limiting
export default withRateLimit(
  RATE_LIMITS.GENERAL.requests,
  RATE_LIMITS.GENERAL.windowMs
)(trackUsageHandler);