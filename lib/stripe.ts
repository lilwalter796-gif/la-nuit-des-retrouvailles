import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  // @ts-ignore - permet d'utiliser la version par défaut du compte Stripe
  apiVersion: undefined,
  typescript: true,
});