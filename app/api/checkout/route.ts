import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    const { ticketType, quantity, customerName, customerEmail, phone } = await req.json();

    const unitAmount = ticketType === 'VIP' ? 5000 : 2000; // 20€ ou 50€ en centimes

    const session = await stripe.checkout.sessions.create({
      // NE PAS METTRE payment_method_types ici (géré automatiquement par Stripe)
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `La Nuit des Retrouvailles - ${ticketType || 'ENTRÉE SIMPLE + CONSO'}`,
              description: 'Accès 1 personne • 17.10.2026 à Parma',
            },
            unit_amount: unitAmount,
          },
          quantity: quantity || 1,
        },
      ],
      mode: 'payment',
      customer_email: customerEmail,
      metadata: {
        ticket_type: ticketType || 'STANDARD',
        quantity: String(quantity || 1),
        customer_name: customerName,
        phone: phone || '',
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://la-nuit-des-retrouvailles.vercel.app'}/ticket?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://la-nuit-des-retrouvailles.vercel.app'}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Erreur Stripe Checkout:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}