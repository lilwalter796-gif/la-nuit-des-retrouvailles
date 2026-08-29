import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20' as any,
});
const resend = new Resend(process.env.RESEND_API_KEY || '');

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const sessionId = searchParams.get('session_id');

    // 1. Recherche par code direct
    if (code) {
      const { data: ticket } = await supabaseAdmin
        .from('tickets')
        .select('*')
        .ilike('ticket_code', code)
        .maybeSingle();

      if (ticket) {
        return NextResponse.json({ ticket });
      }
    }

    // 2. Recherche par session_id Stripe (après paiement)
    if (sessionId) {
      // Vérifier si déjà en base
      const { data: existingTicket } = await supabaseAdmin
        .from('tickets')
        .select('*')
        .eq('stripe_session_id', sessionId)
        .maybeSingle();

      if (existingTicket) {
        return NextResponse.json({ ticket: existingTicket });
      }

      // Si pas encore en base, on interroge Stripe directement
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === 'paid') {
        const customerEmail = session.customer_details?.email || session.customer_email || '';
        const customerName = session.customer_details?.name || 'Participant Confirmé';
        const amountPaid = (session.amount_total || 0) / 100;
        const ticketType = session.metadata?.ticket_type || 'PASS OFFICIEL VIP';

        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const randomAlpha = Math.random().toString(36).substring(2, 7).toUpperCase();
        const ticketCode = `LNR-${randomAlpha}-${randomSuffix}`;

        const newTicket = {
          ticket_code: ticketCode,
          customer_name: customerName,
          customer_email: customerEmail,
          ticket_type: ticketType,
          amount_paid: amountPaid,
          stripe_session_id: sessionId,
          status: 'VALID',
          created_at: new Date().toISOString(),
        };

        await supabaseAdmin.from('tickets').insert([newTicket]);

        // Envoi automatique immédiat de l'email
        if (customerEmail) {
          const ticketUrl = `https://la-nuit-des-retrouvailles.vercel.app/ticket?code=${ticketCode}`;
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(ticketCode)}&margin=10`;

          await resend.emails.send({
            from: 'La Nuit des Retrouvailles <onboarding@resend.dev>',
            to: [customerEmail],
            subject: '🎟️ Votre Billet Officiel — La Nuit des Retrouvailles',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0d0d0d; color: #ffffff; padding: 30px; border-radius: 16px; border: 1px solid #d97706;">
                <div style="text-align: center; margin-bottom: 25px;">
                  <h1 style="color: #ffffff; font-size: 24px; font-weight: 900;">LA NUIT DES RETROUVAILLES</h1>
                  <p style="color: #a1a1aa; font-size: 13px;">Samedi 29 Août 2026 • 21h00 • Parme, Italie</p>
                </div>
                <div style="background-color: #171717; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                  <p style="color: #d4d4d8;">Bonjour <strong>${customerName}</strong>,</p>
                  <p style="color: #a1a1aa;">Votre commande est validée. Voici votre pass officiel :</p>
                  <p><strong>Code Pass :</strong> <span style="color: #facc15; font-family: monospace;">${ticketCode}</span></p>
                  <p><strong>Formule :</strong> ${ticketType}</p>
                </div>
                <div style="text-align: center; margin-bottom: 25px; background: #fff; padding: 15px; border-radius: 12px; display: inline-block;">
                  <img src="${qrCodeUrl}" alt="QR Code" width="180" height="180" style="display: block; margin: 0 auto;" />
                </div>
                <div style="text-align: center;">
                  <a href="${ticketUrl}" style="background-color: #f59e0b; color: #000; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">
                    📥 Voir mon Billet en ligne
                  </a>
                </div>
              </div>
            `,
          });
        }

        return NextResponse.json({ ticket: newTicket });
      }
    }

    return NextResponse.json({ ticket: null }, { status: 404 });
  } catch (err: any) {
    console.error('Erreur API tickets:', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}