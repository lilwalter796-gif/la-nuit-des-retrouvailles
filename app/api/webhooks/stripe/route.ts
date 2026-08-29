import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20' as any,
});

const resend = new Resend(process.env.RESEND_API_KEY || '');

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature') || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } else {
      // Si le secret n'est pas configuré, lecture directe (mode secours)
      event = JSON.parse(rawBody);
      console.warn('⚠️ Attention: STRIPE_WEBHOOK_SECRET non configuré, exécution sans vérification de signature.');
    }
  } catch (err: any) {
    console.error(`❌ Erreur validation Signature Webhook Stripe: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Traitement du paiement réussi
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const customerEmail = session.customer_details?.email || session.customer_email || '';
    const customerName = session.customer_details?.name || 'Participant';
    const amountPaid = (session.amount_total || 0) / 100;
    const ticketType = session.metadata?.ticket_type || 'PASS OFFICIEL VIP';

    // Génération du code unique LNR
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const randomAlpha = Math.random().toString(36).substring(2, 7).toUpperCase();
    const ticketCode = `LNR-${randomAlpha}-${randomSuffix}`;

    console.log(`🎟️ Nouveau billet en cours de création pour ${customerEmail} (Code: ${ticketCode})`);

    // 1. Enregistrement dans Supabase
    try {
      await supabaseAdmin.from('tickets').insert([
        {
          ticket_code: ticketCode,
          customer_name: customerName,
          customer_email: customerEmail,
          ticket_type: ticketType,
          amount_paid: amountPaid,
          stripe_session_id: session.id,
          status: 'VALID',
          created_at: new Date().toISOString(),
        },
      ]);
      console.log('✅ Billet enregistré dans Supabase avec succès.');
    } catch (dbErr) {
      console.error('⚠️ Erreur insertion Supabase (on continue pour l\'envoi email):', dbErr);
    }

    // 2. Envoi de l'email de confirmation via Resend
    if (customerEmail) {
      try {
        const ticketUrl = `https://la-nuit-des-retrouvailles.vercel.app/ticket?code=${ticketCode}`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(ticketCode)}&margin=10`;

        const emailResponse = await resend.emails.send({
          from: 'La Nuit des Retrouvailles <onboarding@resend.dev>',
          to: [customerEmail],
          subject: '🎟️ Votre Billet Officiel — La Nuit des Retrouvailles',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0d0d0d; color: #ffffff; padding: 30px; border-radius: 16px; border: 1px solid #d97706;">
              <div style="text-align: center; margin-bottom: 25px;">
                <p style="color: #f59e0b; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; margin: 0;">Confirmation de Réservation</p>
                <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; margin: 5px 0 0 0;">LA NUIT DES RETROUVAILLES</h1>
                <p style="color: #a1a1aa; font-size: 13px; margin-top: 4px;">Samedi 29 Août 2026 • 21h00 • Parme, Italie</p>
              </div>

              <div style="background-color: #171717; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #262626;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #d4d4d8;">Bonjour <strong>${customerName}</strong>,</p>
                <p style="margin: 0; font-size: 13px; color: #a1a1aa; line-height: 1.5;">Votre commande a été confirmée avec succès. Voici votre pass officiel à présenter à l'entrée :</p>
                
                <div style="margin-top: 15px; border-top: 1px dashed #3f3f46; padding-top: 15px;">
                  <p style="margin: 4px 0; font-size: 13px;"><strong>Formule :</strong> <span style="color: #f59e0b;">${ticketType}</span></p>
                  <p style="margin: 4px 0; font-size: 13px;"><strong>Code Pass :</strong> <span style="font-family: monospace; color: #facc15; font-weight: bold;">${ticketCode}</span></p>
                  <p style="margin: 4px 0; font-size: 13px;"><strong>Montant réglé :</strong> ${amountPaid} €</p>
                </div>
              </div>

              <!-- QR CODE -->
              <div style="text-align: center; margin-bottom: 25px; background-color: #ffffff; padding: 15px; border-radius: 12px; display: inline-block; width: auto;">
                <img src="${qrCodeUrl}" alt="QR Code Billet" width="180" height="180" style="display: block; margin: 0 auto;" />
              </div>

              <div style="text-align: center; margin-bottom: 20px;">
                <a href="${ticketUrl}" style="background-color: #f59e0b; color: #000000; text-decoration: none; padding: 12px 24px; font-size: 14px; font-weight: bold; border-radius: 8px; display: inline-block;">
                  📥 Voir & Télécharger mon Pass
                </a>
              </div>

              <p style="text-align: center; color: #71717a; font-size: 11px; margin-top: 25px; border-top: 1px solid #262626; padding-top: 15px;">
                Conservez cet email précieusement. Ce QR code ne peut être scanné qu'une seule fois à l'entrée.
              </p>
            </div>
          `,
        });

        console.log('📬 Réponse Resend:', emailResponse);
      } catch (emailErr: any) {
        console.error('❌ Erreur envoi email Resend:', emailErr);
      }
    }
  }

  return NextResponse.json({ received: true });
}