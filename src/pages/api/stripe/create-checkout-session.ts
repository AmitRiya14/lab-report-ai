// pages/api/stripe/create-checkout-session.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { stripe, STRIPE_PLANS, PlanType } from '@/lib/stripe';
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

    const { planType }: { planType: PlanType } = req.body;

    // Validate plan type
    if (!planType || !STRIPE_PLANS[planType]) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    const plan = STRIPE_PLANS[planType];

    // Get or create Stripe customer
    let customerId: string;

    // Check if user already has a Stripe customer ID
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('email', session.user.email)
      .single();

    if (userData?.stripe_customer_id) {
      customerId = userData.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name || '',
        metadata: {
          userId: session.user.email, // We use email as identifier
        },
      });

      customerId = customer.id;

      // Store customer ID in database
      await supabaseAdmin
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('email', session.user.email);
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/pricing?canceled=true`,
      metadata: {
        userId: session.user.email,
        planType: planType,
      },
      subscription_data: {
        metadata: {
          userId: session.user.email,
          planType: planType,
        },
      },
      allow_promotion_codes: true, // Allow promo codes
    });

    return res.status(200).json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });

  } catch (error) {
    console.error('Stripe checkout session creation error:', error);
    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}