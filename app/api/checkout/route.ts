import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20' as any,
});

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Récupération souple des champs du formulaire
    const qty = body.quantity && Number(body.quantity) > 0 ? Number(body.quantity) : 1;
    const email = (body.email || body.customerEmail || '').trim();
    const name = (
      body.customerName ||
      `${body.firstName || ''} ${body.lastName || ''}`.trim() ||
      'Participant Confirmé'
    ).trim();
    const phone = (body.phone || '').trim();
    const ticketType = body.ticketType || 'ENTRÉE SIMPLE + CONSO';
    const price = body.price || 20;

    const origin = req.headers.get('origin') || 'https://la-nuit-des-retrouvailles.vercel.app';

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `La Nuit des Retrouvailles — ${ticketType}`,
              description: 'Pass d\'accès officiel avec QR Code (Accès prioritaire + 1 Conso)',
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: qty,
        },
      ],
      mode: 'payment',
      customer_email: email || undefined,
      metadata: {
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        ticket_type: ticketType,
      },
      managed_payments: {
        enabled: false,
      },
      success_url: `${origin}/ticket?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#billets`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Erreur Checkout Stripe:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}