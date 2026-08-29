import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20' as any,
});

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { ticketType, price, customerEmail, customerName } = await req.json();

    const origin = req.headers.get('origin') || 'https://la-nuit-des-retrouvailles.vercel.app';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `La Nuit des Retrouvailles — ${ticketType || 'Pass Entrée'}`,
              description: 'Pass d\'accès officiel avec QR Code',
            },
            unit_amount: Math.round((price || 20) * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: customerEmail || undefined,
      metadata: {
        ticket_type: ticketType || 'PASS OFFICIEL VIP',
        customer_name: customerName || 'Invité Confirmé',
      },
      // IMPORTANT : Stripe remplace automatiquement {CHECKOUT_SESSION_ID} par le vrai ID unique de transaction
      success_url: `${origin}/ticket?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#billetterie`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Erreur Checkout Stripe:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}