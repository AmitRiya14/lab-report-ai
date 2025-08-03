// lib/stripe.ts
import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
  typescript: true,
});

// Client-side Stripe instance
let stripePromise: Promise<any>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

// Plan configurations that match your pricing page
export const STRIPE_PLANS = {
  basic: {
    name: 'Basic',
    priceId: 'price_basic_monthly', // You'll get this from Stripe dashboard
    price: 999, // $9.99 in cents
    reports: 15,
    features: ['15 reports/month', 'PDF export', 'Email support']
  },
  pro: {
    name: 'Pro',
    priceId: 'price_pro_monthly', // You'll get this from Stripe dashboard
    price: 1999, // $19.99 in cents
    reports: 50,
    features: ['50 reports/month', 'Advanced analytics', 'Priority support']
  },
  plus: {
    name: 'Plus',
    priceId: 'price_plus_monthly', // You'll get this from Stripe dashboard
    price: 3999, // $39.99 in cents
    reports: 999, // Unlimited
    features: ['Unlimited reports', 'API access', 'Custom branding']
  }
} as const;

export type PlanType = keyof typeof STRIPE_PLANS;