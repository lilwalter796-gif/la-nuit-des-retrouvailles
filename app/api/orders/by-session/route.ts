import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID requis' }, { status: 400 });
    }

    // 1. Récupérer la session directement depuis Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Paiement non validé' }, { status: 400 });
    }

    const meta = session.metadata || {};
    const firstName = meta.firstName || 'Invité';
    const lastName = meta.lastName || '';
    const email = meta.email || session.customer_details?.email || '';
    const phone = meta.phone || '';
    const totalTickets = parseInt(meta.quantity || '1', 10);
    const eventId = meta.eventId || 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';

    // 2. Vérifier si la commande existe déjà dans Supabase
    let { data: order } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .single();

    // Si la commande n'existe pas encore, on la crée
    if (!order) {
      const { data: newOrder, error: orderErr } = await supabaseAdmin
        .from('orders')
        .insert({
          event_id: eventId,
          customer_first_name: firstName,
          customer_last_name: lastName,
          customer_email: email,
          customer_phone: phone,
          amount: (session.amount_total || 2000) / 100,
          stripe_session_id: session.id,
          status: 'PAID',
        })
        .select()
        .single();

      if (orderErr) throw orderErr;
      order = newOrder;

      // Récupérer le type de billet
      const { data: ticketType } = await supabaseAdmin
        .from('ticket_types')
        .select('id')
        .limit(1)
        .single();

      // Création des billets
      const ticketsToCreate = [];
      for (let i = 0; i < totalTickets; i++) {
        const randomCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        ticketsToCreate.push({
          order_id: order.id,
          ticket_type_id: ticketType?.id || eventId,
          ticket_number: `LNR-${randomCode}-IT`,
          qr_token: `lnr_sec_${crypto.randomBytes(16).toString('hex')}`,
          holder_first_name: firstName,
          holder_last_name: lastName,
          status: 'VALID',
          ticket_category: 'PREVENTE',
        });
      }

      const { data: createdTickets, error: tErr } = await supabaseAdmin
        .from('tickets')
        .insert(ticketsToCreate)
        .select();

      if (tErr) throw tErr;

      return NextResponse.json({ order, tickets: createdTickets });
    }

    // Si la commande existe déjà, renvoyer les billets associés
    const { data: tickets } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .eq('order_id', order.id);

    return NextResponse.json({ order, tickets: tickets || [] });
  } catch (error: any) {
    console.error('Erreur by-session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}