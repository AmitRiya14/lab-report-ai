// pages/api/stripe/customer-portal.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's Stripe customer ID
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('email', session.user.email)
      .single();

    if (!userData?.stripe_customer_id) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    // Create customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: `${req.headers.origin}/pricing`,
    });

    return res.status(200).json({
      url: portalSession.url,
    });

  } catch (error) {
    console.error('Customer portal creation error:', error);
    return res.status(500).json({ 
      error: 'Failed to create customer portal session',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}