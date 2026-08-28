import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

interface SendTicketEmailParams {
  toEmail: string;
  customerName: string;
  ticketCode: string;
  ticketType: string;
  siteUrl?: string;
}

export async function sendTicketEmail({
  toEmail,
  customerName,
  ticketCode,
  ticketType,
  siteUrl = 'https://la-nuit-des-retrouvailles.vercel.app',
}: SendTicketEmailParams) {
  if (!resend || !toEmail) {
    console.warn('Resend non configuré ou email manquant, email ignoré.');
    return;
  }

  try {
    const ticketUrl = `${siteUrl}/ticket?code=${encodeURIComponent(ticketCode)}`;

    await resend.emails.send({
      from: 'Billetterie <onboarding@resend.dev>',
      to: toEmail,
      subject: `Votre Pass Officiel - La Nuit des Retrouvailles (${ticketCode})`,
      html: `
        <div style="font-family: sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 24px; border-radius: 12px; max-width: 500px; margin: auto;">
          <h2 style="color: #f59e0b; margin-top: 0; text-transform: uppercase;">La Nuit des Retrouvailles</h2>
          <p>Bonjour <strong>${customerName}</strong>,</p>
          <p>Votre réservation a bien été validée avec succès !</p>
          <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Formule :</strong> <span style="color: #f59e0b;">${ticketType}</span></p>
            <p style="margin: 4px 0;"><strong>Code Pass :</strong> <span style="font-family: monospace; font-weight: bold;">${ticketCode}</span></p>
            <p style="margin: 4px 0;"><strong>Date :</strong> 17 Octobre 2026 à Parma</p>
          </div>
          <p style="text-align: center; margin-top: 24px;">
            <a href="${ticketUrl}" style="background-color: #f59e0b; color: #000000; text-decoration: none; font-weight: bold; padding: 12px 24px; border-radius: 8px; display: inline-block;">
              Accéder à mon Billet & QR Code
            </a>
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email via Resend :", error);
  }
}