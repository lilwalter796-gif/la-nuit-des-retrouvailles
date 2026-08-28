import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Erreur: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const meta = session.metadata;

    if (meta) {
      const { firstName, lastName, email, phone, quantity, eventId } = meta;
      const totalTickets = parseInt(quantity, 10) || 1;

      // 1. Récupération du type de billet
      const { data: ticketType } = await supabaseAdmin
        .from('ticket_types')
        .select('id')
        .eq('event_id', eventId)
        .single();

      if (ticketType) {
        // 2. Création de la commande
        const { data: order } = await supabaseAdmin
          .from('orders')
          .insert({
            event_id: eventId,
            customer_first_name: firstName,
            customer_last_name: lastName,
            customer_email: email,
            customer_phone: phone,
            amount: (session.amount_total || 0) / 100,
            stripe_session_id: session.id,
            status: 'PAID',
          })
          .select()
          .single();

        // 3. Création des billets individuels avec QR Tokens
        if (order) {
          const ticketsList = [];
          for (let i = 0; i < totalTickets; i++) {
            const code = crypto.randomBytes(3).toString('hex').toUpperCase();
            ticketsList.push({
              order_id: order.id,
              ticket_type_id: ticketType.id,
              ticket_number: `LNR-${code}-IT`,
              qr_token: `lnr_sec_${crypto.randomBytes(16).toString('hex')}`,
              holder_first_name: firstName,
              holder_last_name: lastName,
              status: 'VALID',
              ticket_category: 'PREVENTE',
            });
          }
          await supabaseAdmin.from('tickets').insert(ticketsList);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}