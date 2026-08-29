import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get('to');

  if (!to) {
    return NextResponse.json({
      success: false,
      error: 'Veuillez passer votre email dans l\'URL. Exemple: /api/test-email?to=monemail@gmail.com',
    });
  }

  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey) {
    return NextResponse.json({
      success: false,
      error: 'La variable RESEND_API_KEY est manquante ou vide dans l\'environnement Vercel !',
    });
  }

  try {
    const resend = new Resend(resendKey);
    const result = await resend.emails.send({
      from: 'La Nuit des Retrouvailles <onboarding@resend.dev>',
      to: [to],
      subject: '🎟️ Test Réception Billet — La Nuit des Retrouvailles',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #000; color: #fff; border-radius: 10px;">
          <h2 style="color: #f59e0b;">Test d'envoi réussi !</h2>
          <p>La clé Resend fonctionne parfaitement et votre boîte de réception reçoit bien les emails.</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: `Email envoyé avec succès vers ${to}`,
      resendResponse: result,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      details: err,
    }, { status: 500 });
  }
}