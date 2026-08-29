import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20' as any,
});

const resend = new Resend(process.env.RESEND_API_KEY || '');

export const dynamic = 'force-dynamic';

function generateRandomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let middle = '';
  for (let i = 0; i < 5; i++) {
    middle += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `LNR-${middle}-${digits}`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const sessionId = searchParams.get('session_id');

    // 1. Recherche par code du billet (depuis le lien dans l'email)
    if (code) {
      const cleanCode = code.trim();
      const { data: ticket, error } = await supabaseAdmin
        .from('tickets')
        .select('*')
        .ilike('ticket_code', cleanCode)
        .maybeSingle();

      if (ticket) {
        return NextResponse.json({ ticket });
      }
    }

    // 2. Traitement immédiat après paiement Stripe (session_id)
    if (sessionId) {
      const cleanSessionId = sessionId.trim();

      // Vérifier si le billet existe déjà
      const { data: existingTicket } = await supabaseAdmin
        .from('tickets')
        .select('*')
        .eq('stripe_session_id', cleanSessionId)
        .maybeSingle();

      if (existingTicket) {
        return NextResponse.json({ ticket: existingTicket });
      }

      // Récupérer la session auprès de Stripe
      const session = await stripe.checkout.sessions.retrieve(cleanSessionId);

      if (session.payment_status === 'paid') {
        const customerEmail = session.customer_details?.email || session.customer_email || '';
        const customerName = session.metadata?.customer_name || session.customer_details?.name || 'Participant Confirmé';
        const amountPaid = (session.amount_total || 0) / 100;
        const ticketType = session.metadata?.ticket_type || 'ENTRÉE SIMPLE + CONSO';

        const ticketCode = generateRandomCode();
        const now = new Date().toISOString();

        const newTicket = {
          ticket_code: ticketCode,
          customer_name: customerName,
          customer_email: customerEmail,
          ticket_type: ticketType,
          amount_paid: amountPaid,
          stripe_session_id: cleanSessionId,
          status: 'VALID',
          created_at: now,
        };

        // Sauvegarde dans Supabase
        await supabaseAdmin.from('tickets').insert([newTicket]);

        // Envoi de l'email avec la bonne date (17 Octobre 2026) et la vraie formule
        if (customerEmail) {
          const ticketUrl = `https://la-nuit-des-retrouvailles.vercel.app/ticket?code=${ticketCode}`;
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(ticketCode)}&margin=10`;

          try {
            await resend.emails.send({
              from: 'La Nuit des Retrouvailles <onboarding@resend.dev>',
              to: [customerEmail],
              subject: `🎟️ Votre Billet [${ticketCode}] — La Nuit des Retrouvailles`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #070707; color: #ffffff; padding: 30px; border-radius: 20px; border: 1px solid #d97706;">
                  <div style="text-align: center; margin-bottom: 25px;">
                    <p style="color: #f59e0b; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; margin: 0;">Billet d'Accès Officiel</p>
                    <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; margin: 6px 0 0 0;">LA NUIT DES RETROUVAILLES</h1>
                    <p style="color: #a1a1aa; font-size: 13px; margin-top: 4px;">Samedi 17 Octobre 2026 • 21h00 • Parme, Italie</p>
                  </div>

                  <div style="background-color: #141414; border-radius: 14px; padding: 20px; margin-bottom: 25px; border: 1px solid #262626;">
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #d4d4d8;">Bonjour <strong>${customerName}</strong>,</p>
                    <p style="margin: 0; font-size: 13px; color: #a1a1aa; line-height: 1.5;">Votre réservation a été validée. Voici votre billet d'entrée :</p>
                    
                    <div style="margin-top: 15px; border-top: 1px dashed #3f3f46; padding-top: 15px;">
                      <p style="margin: 4px 0; font-size: 13px;"><strong>Titulaire :</strong> ${customerName}</p>
                      <p style="margin: 4px 0; font-size: 13px;"><strong>Formule :</strong> <span style="color: #f59e0b; font-weight: bold;">${ticketType}</span></p>
                      <p style="margin: 4px 0; font-size: 13px;"><strong>Code Pass :</strong> <span style="font-family: monospace; color: #facc15; font-weight: bold; font-size: 15px;">${ticketCode}</span></p>
                      <p style="margin: 4px 0; font-size: 13px;"><strong>Montant :</strong> ${amountPaid} €</p>
                    </div>
                  </div>

                  <div style="text-align: center; margin-bottom: 25px;">
                    <div style="background-color: #ffffff; padding: 15px; border-radius: 16px; display: inline-block;">
                      <img src="${qrCodeUrl}" alt="QR Code Billet" width="180" height="180" style="display: block; margin: 0 auto;" />
                    </div>
                  </div>

                  <div style="text-align: center; margin-bottom: 20px;">
                    <a href="${ticketUrl}" style="background-color: #f59e0b; color: #000000; text-decoration: none; padding: 14px 28px; font-size: 14px; font-weight: bold; border-radius: 10px; display: inline-block; text-transform: uppercase;">
                      📥 Télécharger mon Pass (PDF)
                    </a>
                  </div>

                  <p style="text-align: center; color: #71717a; font-size: 11px; margin-top: 25px; border-top: 1px solid #262626; padding-top: 15px;">
                    Conservez cet email précieusement. Ce QR code ne peut être scanné qu'une seule fois à l'entrée.
                  </p>
                </div>
              `,
            });
          } catch (emailErr) {
            console.error('Erreur envoi email:', emailErr);
          }
        }

        return NextResponse.json({ ticket: newTicket });
      }
    }

    return NextResponse.json({ ticket: null }, { status: 404 });
  } catch (err: any) {
    console.error('Erreur API tickets:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}