// lib/stripe.ts
import Stripe from 'stripe';
import { loadStripe, Stripe as StripeJS } from '@stripe/stripe-js';

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
  typescript: true,
});

// Client-side Stripe instance - use const and proper type
const stripePromise: Promise<StripeJS | null> = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export const getStripe = () => {
  return stripePromise;
};

// Plan configurations that match your pricing page
export const STRIPE_PLANS = {
  basic: {
    name: 'Basic',
    priceId: process.env.STRIPE_PRICE_BASIC!, // You'll get this from Stripe dashboard
    price: 999, // $9.99 in cents
    reports: 15,
    features: ['15 reports/month', 'PDF export', 'Email support']
  },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRICE_PRO!, // You'll get this from Stripe dashboard
    price: 1999, // $19.99 in cents
    reports: 50,
    features: ['50 reports/month', 'Advanced analytics', 'Priority support']
  },
  plus: {
    name: 'Plus',
    priceId: process.env.STRIPE_PRICE_PLUS!, // You'll get this from Stripe dashboard
    price: 3999, // $39.99 in cents
    reports: 999, // Unlimited
    features: ['Unlimited reports', 'API access', 'Custom branding']
  }
} as const;

export type PlanType = keyof typeof STRIPE_PLANS;