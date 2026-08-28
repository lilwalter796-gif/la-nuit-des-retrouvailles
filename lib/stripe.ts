import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  // Laisse Stripe utiliser automatiquement la version de votre compte sans restriction
  typescript: true,
});