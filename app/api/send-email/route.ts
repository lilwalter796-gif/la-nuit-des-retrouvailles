import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { toEmail, customerName, ticketCode, ticketType } = await req.json();

    if (!toEmail || !ticketCode) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Clé RESEND_API_KEY non configurée sur le serveur' }, { status: 500 });
    }

    const resend = new Resend(apiKey);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lanuitdesretrouvailles.com';
    const ticketUrl = `${siteUrl}/ticket?code=${encodeURIComponent(ticketCode)}`;
    
    // URL directe de l'API publique pour afficher le QR code directement dans le corps de l'e-mail
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(ticketCode)}&margin=10`;

    const { data, error } = await resend.emails.send({
      from: 'La Nuit des Retrouvailles <contact@lanuitdesretrouvailles.com>',
      to: [toEmail],
      subject: `🎟️ Votre Billet Officiel [${ticketCode}] — La Nuit des Retrouvailles`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #070707; color: #ffffff; padding: 30px; border-radius: 20px; border: 1px solid #d97706;">
          <div style="text-align: center; margin-bottom: 25px;">
            <p style="color: #f59e0b; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; margin: 0;">Billet d'Accès Officiel</p>
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; margin: 6px 0 0 0;">LA NUIT DES RETROUVAILLES</h1>
            <p style="color: #a1a1aa; font-size: 13px; margin-top: 4px;">Samedi 17 Octobre 2026 • 21h00 • Parme, Italie</p>
          </div>

          <div style="background-color: #141414; border-radius: 14px; padding: 20px; margin-bottom: 25px; border: 1px solid #262626;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #d4d4d8;">Bonjour <strong>${customerName || 'Participant'}</strong>,</p>
            <p style="margin: 0; font-size: 13px; color: #a1a1aa; line-height: 1.5;">Votre commande est confirmée. Voici votre QR code d'accès direct à présenter à l'entrée :</p>
            
            <div style="margin-top: 15px; border-top: 1px dashed #3f3f46; padding-top: 15px;">
              <p style="margin: 4px 0; font-size: 13px;"><strong>Titulaire :</strong> ${customerName || 'Participant'}</p>
              <p style="margin: 4px 0; font-size: 13px;"><strong>Formule :</strong> <span style="color: #f59e0b; font-weight: bold;">${ticketType || 'ENTRÉE SIMPLE'}</span></p>
              <p style="margin: 4px 0; font-size: 13px;"><strong>Code Pass :</strong> <span style="font-family: monospace; color: #facc15; font-weight: bold; font-size: 15px;">${ticketCode}</span></p>
            </div>
          </div>

          <!-- AFFICHAGE DIRECT DU QR CODE -->
          <div style="text-align: center; margin-bottom: 25px;">
            <div style="background-color: #ffffff; padding: 15px; border-radius: 16px; display: inline-block;">
              <img src="${qrCodeUrl}" alt="QR Code Billet" width="180" height="180" style="display: block; margin: 0 auto;" />
            </div>
          </div>

          <div style="text-align: center; margin-bottom: 20px;">
            <a href="${ticketUrl}" style="background-color: #f59e0b; color: #000000; text-decoration: none; padding: 14px 28px; font-size: 14px; font-weight: bold; border-radius: 10px; display: inline-block; text-transform: uppercase; font-family: sans-serif;">
              📥 Ouvrir la version web du Pass
            </a>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Erreur API Resend:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Erreur serveur send-email:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}