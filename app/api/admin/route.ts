import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Initialisation de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Initialisation de Resend pour l'envoi d'emails
const resend = new Resend(process.env.RESEND_API_KEY || '');

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pin = searchParams.get('pin');

    if (pin !== '8520') {
      return NextResponse.json({ error: 'Accès non autorisé : PIN incorrect' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      throw new Error("Supabase n'est pas correctement configuré.");
    }

    const { data: tickets, error } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const allTickets = tickets || [];
    const totalSold = allTickets.length;
    
    const scannedCount = allTickets.filter(
      (t) => t.is_scanned === true || t.status === 'SCANNED'
    ).length;
    
    const scannedRate = totalSold > 0 ? Math.round((scannedCount / totalSold) * 100) : 0;
    
    const totalRevenue = allTickets
      .reduce((sum, t) => sum + (Number(t.amount_paid) || 0), 0)
      .toFixed(2);

    return NextResponse.json({
      stats: { totalSold, scannedCount, scannedRate, totalRevenue },
      tickets: allTickets,
    });

  } catch (err: any) {
    console.error('Erreur API Admin GET:', err);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pin, holder_name, holder_email, ticket_type } = body;

    if (pin !== '8520') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // 1. Génération du code VIP
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let middle = '';
    for (let i = 0; i < 5; i++) {
      middle += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const ticketCode = `VIP-${middle}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 2. Format exact correspondant à un achat Stripe pour éviter les erreurs Supabase
    const newTicket = {
      ticket_code: ticketCode,
      customer_name: holder_name,
      customer_email: holder_email,
      ticket_type: ticket_type || 'VIP_INVITE',
      amount_paid: 0,
      stripe_session_id: `vip_invite_${Date.now()}`, // Remplit la colonne obligatoire
      status: 'VALID',
      created_at: new Date().toISOString(),
    };

    // 3. Insertion dans Supabase
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from('tickets').insert([newTicket]);
      if (error) {
        console.error('Erreur d\'insertion Supabase:', error);
        throw new Error(`Erreur Base de données: ${error.message}`);
      }
    }

    // 4. Envoi de l'email officiel au VIP
    if (holder_email) {
      const origin = 'https://la-nuit-des-retrouvailles.vercel.app';
      const ticketUrl = `${origin}/ticket?code=${ticketCode}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(ticketCode)}&margin=10`;

      try {
        await resend.emails.send({
          // NOTE: Changez l'adresse 'from' si vous avez validé votre propre nom de domaine
          from: 'La Nuit des Retrouvailles <onboarding@resend.dev>',
          to: [holder_email],
          subject: `🎟️ Invitation VIP [${ticketCode}] — La Nuit des Retrouvailles`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #070707; color: #ffffff; padding: 30px; border-radius: 20px; border: 1px solid #d97706;">
              <div style="text-align: center; margin-bottom: 25px;">
                <p style="color: #f59e0b; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; margin: 0;">Invitation Officielle</p>
                <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; margin: 6px 0 0 0;">LA NUIT DES RETROUVAILLES</h1>
                <p style="color: #a1a1aa; font-size: 13px; margin-top: 4px;">Samedi 17 Octobre 2026 • 21h00 • Parme, Italie</p>
              </div>

              <div style="background-color: #141414; border-radius: 14px; padding: 20px; margin-bottom: 25px; border: 1px solid #262626;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #d4d4d8;">Bonjour <strong>${holder_name}</strong>,</p>
                <p style="margin: 0; font-size: 13px; color: #a1a1aa; line-height: 1.5;">Vous êtes invité(e) sur la liste VIP. Voici votre pass officiel à présenter à l'entrée :</p>
                
                <div style="margin-top: 15px; border-top: 1px dashed #3f3f46; padding-top: 15px;">
                  <p style="margin: 4px 0; font-size: 13px;"><strong>Titulaire :</strong> ${holder_name}</p>
                  <p style="margin: 4px 0; font-size: 13px;"><strong>Catégorie :</strong> <span style="color: #f59e0b; font-weight: bold;">${ticket_type}</span></p>
                  <p style="margin: 4px 0; font-size: 13px;"><strong>Code Pass :</strong> <span style="font-family: monospace; color: #facc15; font-weight: bold; font-size: 15px;">${ticketCode}</span></p>
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
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('Erreur lors de l\'envoi de l\'email VIP via Resend:', emailErr);
      }
    }

    return NextResponse.json({ success: true, ticket: newTicket });
  } catch (err: any) {
    console.error('Erreur API Admin POST:', err);
    // Renvoie le message d'erreur exact pour déboguer si Supabase refuse toujours l'insertion
    return NextResponse.json({ error: err.message || 'Erreur création VIP' }, { status: 500 });
  }
}