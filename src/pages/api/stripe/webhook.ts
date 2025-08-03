// pages/api/stripe/webhook.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { buffer } from 'micro';
import Stripe from 'stripe';

// Disable body parser for webhook
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  console.log('Received Stripe webhook event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const planType = session.metadata?.planType;

  if (!userId || !planType) {
    console.error('Missing metadata in checkout session');
    return;
  }

  console.log(`Checkout completed for user ${userId}, plan: ${planType}`);

  // Update user's tier and reset usage
  await supabaseAdmin
    .from('users')
    .update({
      tier: planType === 'basic' ? 'Basic' : planType === 'pro' ? 'Pro' : 'Plus',
      reports_used: 0, // Reset usage on new subscription
      stripe_subscription_id: session.subscription,
      updated_at: new Date().toISOString(),
    })
    .eq('email', userId);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  const planType = subscription.metadata?.planType;

  if (!userId) {
    console.error('Missing userId in subscription metadata');
    return;
  }

  console.log(`Subscription created for user ${userId}`);

  // Create subscription record with proper property access
  await supabaseAdmin
    .from('subscriptions')
    .insert({
      user_email: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status,
      plan_type: planType || 'basic',
      // Fix: Access properties correctly
      current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
      current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('Missing userId in subscription metadata');
    return;
  }

  console.log(`Subscription updated for user ${userId}`);

  // Update subscription record
await supabaseAdmin
  .from('subscriptions')
  .update({
    status: subscription.status,
    current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
    current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  })
  .eq('stripe_subscription_id', subscription.id);

  // Update user tier based on subscription status
  if (subscription.status === 'active') {
    const planType = subscription.metadata?.planType || 'basic';
    await supabaseAdmin
      .from('users')
      .update({
        tier: planType === 'basic' ? 'Basic' : planType === 'pro' ? 'Pro' : 'Plus',
        updated_at: new Date().toISOString(),
      })
      .eq('email', userId);
  } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    // Downgrade to free tier
    await supabaseAdmin
      .from('users')
      .update({
        tier: 'Free',
        updated_at: new Date().toISOString(),
      })
      .eq('email', userId);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('Missing userId in subscription metadata');
    return;
  }

  console.log(`Subscription deleted for user ${userId}`);

  // Update subscription status
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  // Downgrade user to free tier
  await supabaseAdmin
    .from('users')
    .update({
      tier: 'Free',
      reports_used: 0, // Reset usage
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('email', userId);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;
  
  if (!subscriptionId) return;

  // Reset usage count for the new billing period
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('user_email')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (subscription) {
    await supabaseAdmin
      .from('users')
      .update({
        reports_used: 0, // Reset usage on successful payment
        reset_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('email', subscription.user_email);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;
  
  if (!subscriptionId) return;

  console.log(`Payment failed for subscription ${subscriptionId}`);
  
  // You might want to send an email notification or update user status
  // For now, we'll just log it
}