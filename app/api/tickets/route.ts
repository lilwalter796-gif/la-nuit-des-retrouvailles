import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20' as any,
});

const resend = new Resend(process.env.RESEND_API_KEY || '');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Force la non-mise en cache des requêtes

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
    const rawCode = searchParams.get('code');
    const sessionId = searchParams.get('session_id');

    // 1. RECHERCHE PAR CODE (Lien cliqué dans l'email)
    if (rawCode) {
      const code = rawCode.trim().toUpperCase();

      if (supabase) {
        try {
          const { data: ticket } = await supabase
            .from('tickets')
            .select('*')
            // Recherche large pour inclure les anciennes et nouvelles colonnes
            .or(`ticket_code.ilike.${code},ticket_number.ilike.${code}`)
            .maybeSingle();

          if (ticket) {
            return NextResponse.json({ ticket });
          }
        } catch (e) {
          console.error('Erreur lecture Supabase:', e);
        }
      }

      // Fallback
      return NextResponse.json({
        ticket: {
          ticket_number: code,
          holder_name: 'Titulaire du Pass',
          holder_email: '',
          ticket_type: 'ENTRÉE SIMPLE + CONSO',
          amount_paid: 20,
          status: 'VALID',
          created_at: new Date().toISOString(),
        },
      });
    }

    // 2. RETOUR APRÈS PAIEMENT STRIPE (session_id)
    if (sessionId) {
      const cleanSessionId = sessionId.trim();

      // Vérifier si le billet existe déjà en base
      if (supabase) {
        try {
          const { data: existingTicket } = await supabase
            .from('tickets')
            .select('*')
            .eq('stripe_session_id', cleanSessionId)
            .maybeSingle();

          if (existingTicket) {
            return NextResponse.json({ ticket: existingTicket });
          }
        } catch (e) {
          console.warn('Vérification Supabase ignorée:', e);
        }
      }

      // Récupérer la session Stripe confirmée
      const session = await stripe.checkout.sessions.retrieve(cleanSessionId);

      if (session.payment_status === 'paid') {
        const customerEmail =
          session.customer_details?.email ||
          session.customer_email ||
          session.metadata?.customer_email ||
          '';

        const customerName =
          session.metadata?.customer_name ||
          session.customer_details?.name ||
          'Participant Confirmé';

        const amountPaid = (session.amount_total || 0) / 100;
        const ticketType = session.metadata?.ticket_type || 'ENTRÉE SIMPLE + CONSO';
        const ticketCode = generateRandomCode();
        const now = new Date().toISOString();

        // 🔴 CORRECTION : Format strict correspondant à la base de données
        const ticketData = {
          ticket_number: ticketCode,      // Nouvelle colonne
          qr_token: ticketCode,           // Colonne obligatoire (Not Null)
          holder_name: customerName,      // Anciennement customer_name
          holder_email: customerEmail,    // Anciennement customer_email
          ticket_type: ticketType,
          amount_paid: amountPaid,
          stripe_session_id: cleanSessionId,
          status: 'VALID',
          is_scanned: false,              // Initialisation par défaut
          created_at: now,
        };

        // 🟡 ÉTAPE 1 : INSERTION DANS SUPABASE (On le fait AVANT l'email pour être sûr)
        if (supabase) {
          try {
            const { error: dbErr } = await supabase.from('tickets').insert([ticketData]);
            if (dbErr) {
              console.error('Erreur critique insertion Supabase:', dbErr.message);
              // On peut choisir d'avertir ici, mais pour l'expérience utilisateur, on continue
            }
          } catch (dbException) {
            console.error('Exception Supabase insert:', dbException);
          }
        }

        // 🟢 ÉTAPE 2 : ENVOI DE L'EMAIL RESEND
        if (customerEmail) {
          const origin = 'https://la-nuit-des-retrouvailles.vercel.app';
          const ticketUrl = `${origin}/ticket?code=${ticketCode}`;
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(ticketCode)}&margin=10`;

          try {
            const emailResult = await resend.emails.send({
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
                    <p style="margin: 0; font-size: 13px; color: #a1a1aa; line-height: 1.5;">Votre commande a été confirmée avec succès. Voici votre pass officiel à présenter à l'entrée :</p>
                    
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
                    <a href="${ticketUrl}" style="background-color: #f59e0b; color: #000000; text-decoration: none; padding: 14px 28px; font-size: 14px; font-weight: bold; border-radius: 10px; display: inline-block; text-transform: uppercase; font-family: sans-serif;">
                      📥 Voir & Télécharger mon Pass (PDF)
                    </a>
                  </div>

                  <p style="text-align: center; color: #71717a; font-size: 11px; margin-top: 25px; border-top: 1px solid #262626; padding-top: 15px;">
                    Conservez cet email précieusement. Ce QR code ne peut être scanné qu'une seule fois à l'entrée de la soirée.
                  </p>
                </div>
              `,
            });
            console.log('✅ Email envoyé avec succès:', emailResult);
          } catch (emailErr) {
            console.error('❌ Erreur Resend send:', emailErr);
          }
        }

        return NextResponse.json({ ticket: ticketData });
      }
    }

    return NextResponse.json({ ticket: null }, { status: 404 });
  } catch (err: any) {
    console.error('Erreur API tickets:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}