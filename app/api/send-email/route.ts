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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://la-nuit-des-retrouvailles.vercel.app';
    const ticketUrl = `${siteUrl}/ticket?code=${encodeURIComponent(ticketCode)}`;

    const { data, error } = await resend.emails.send({
      from: 'La Nuit des Retrouvailles <onboarding@resend.dev>',
      to: [toEmail],
      subject: `Votre Billet Officiel - La Nuit des Retrouvailles (${ticketCode})`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #000000; color: #ffffff; padding: 32px 20px; text-align: center;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #121212; border: 1px solid #27272a; border-radius: 24px; padding: 32px 24px;">
            <div style="display: inline-block; background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 6px 14px; border-radius: 9999px; margin-bottom: 16px;">
              Billet Officiel Confirmé
            </div>
            
            <h1 style="color: #ffffff; font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px 0;">
              La Nuit des Retrouvailles
            </h1>
            <p style="color: #f59e0b; font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 24px 0;">
              17 OCTOBRE 2026 • PARMA
            </p>

            <div style="background-color: #1c1c1f; border-radius: 16px; padding: 16px; text-align: left; margin-bottom: 24px;">
              <div style="margin-bottom: 12px; border-bottom: 1px solid #27272a; padding-bottom: 8px;">
                <span style="color: #71717a; font-size: 11px; text-transform: uppercase; display: block;">Participant</span>
                <strong style="color: #ffffff; font-size: 14px;">${customerName}</strong>
              </div>
              <div style="margin-bottom: 12px; border-bottom: 1px solid #27272a; padding-bottom: 8px;">
                <span style="color: #71717a; font-size: 11px; text-transform: uppercase; display: block;">Formule</span>
                <strong style="color: #f59e0b; font-size: 14px;">${ticketType}</strong>
              </div>
              <div>
                <span style="color: #71717a; font-size: 11px; text-transform: uppercase; display: block;">Code Pass Unique</span>
                <strong style="color: #ffffff; font-size: 15px; font-family: monospace;">${ticketCode}</strong>
              </div>
            </div>

            <a href="${ticketUrl}" style="display: block; background-color: #f59e0b; color: #000000; font-weight: 800; text-decoration: none; padding: 14px 20px; border-radius: 12px; font-size: 14px; text-transform: uppercase;">
              Afficher mon QR Code
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