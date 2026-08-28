import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { stripe } from '@/lib/stripe';
import { sendTicketEmail } from '@/lib/resend';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const sessionId = searchParams.get('session_id');

    if (!code && !sessionId) {
      return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 });
    }

    // 1. Supabase
    let query = supabaseAdmin.from('tickets').select('*');
    if (code) {
      query = query.eq('ticket_code', code);
    } else if (sessionId) {
      query = query.eq('stripe_session_id', sessionId);
    }

    const { data: existingTicket } = await query.maybeSingle();
    if (existingTicket) {
      return NextResponse.json({ ticket: existingTicket });
    }

    // 2. Stripe direct
    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session && (session.payment_status === 'paid' || session.status === 'complete')) {
        const customerEmail = session.customer_details?.email || '';
        const customerName = session.customer_details?.name || 'Invité';
        const ticketType = session.metadata?.ticket_type || 'ENTRÉE SIMPLE + CONSO';
        const ticketCode = `LNR-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Date.now().toString().slice(-4)}`;

        const { data: newTicket, error: insertError } = await supabaseAdmin
          .from('tickets')
          .insert([
            {
              ticket_code: ticketCode,
              stripe_session_id: session.id,
              customer_email: customerEmail,
              customer_name: customerName,
              ticket_type: ticketType,
              amount_paid: (session.amount_total || 2000) / 100,
              status: 'VALID',
            },
          ])
          .select()
          .single();

        if (insertError) {
          console.error('Erreur insertion Supabase:', insertError);
          return NextResponse.json({ error: 'Erreur lors de la création du billet' }, { status: 500 });
        }

        if (customerEmail) {
          sendTicketEmail({
            toEmail: customerEmail,
            customerName: customerName,
            ticketCode: ticketCode,
            ticketType: ticketType,
          }).catch(console.error);
        }

        return NextResponse.json({ ticket: newTicket });
      }
    }

    return NextResponse.json({ error: 'Billet non trouvé' }, { status: 404 });
  } catch (err: any) {
    console.error('Erreur API Verify:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}