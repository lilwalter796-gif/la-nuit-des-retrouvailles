import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    const { quantity, firstName, lastName, email, phone } = await req.json();

    if (!quantity || !firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { error: 'Veuillez remplir toutes les informations requises.' },
        { status: 400 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'La Nuit des Retrouvailles — Prévente',
              description: 'Entrée + 1 Conso incluse • 17 Octobre 2026 à Parma',
              tax_code: 'txcd_10501000', // Code fiscal Stripe officiel pour les billets de spectacle / concert
            },
            unit_amount: 2000, // 20.00 €
          },
          quantity: Number(quantity),
        },
      ],
      mode: 'payment',
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/#billets`,
      metadata: {
        firstName,
        lastName,
        email,
        phone,
        quantity: String(quantity),
        eventId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Erreur Stripe Checkout:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la création de la session Stripe' },
      { status: 500 }
    );
  }
}