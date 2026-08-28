import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, pin } = body;

    if (pin !== '8520') {
      return NextResponse.json({ status: 'INVALID', message: 'Code PIN incorrect' });
    }

    if (!code) {
      return NextResponse.json({ status: 'INVALID', message: 'Aucun code fourni' });
    }

    let cleanCode = String(code).trim();
    if (cleanCode.includes('code=')) {
      cleanCode = cleanCode.split('code=')[1].split('&')[0];
    } else if (cleanCode.includes('/ticket/')) {
      cleanCode = cleanCode.split('/ticket/')[1].split('?')[0];
    }

    // 1. Recherche dans Supabase
    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .ilike('ticket_code', cleanCode)
      .maybeSingle();

    // 2. Si le billet existe déjà
    if (ticket) {
      const isUsed = String(ticket.status).toUpperCase() === 'USED';

      if (isUsed) {
        return NextResponse.json({
          status: 'ALREADY_USED',
          message: '⚠️ BILLET DÉJÀ UTILISÉ !',
          ticket,
        });
      }

      // Mise à jour immédiate
      await supabaseAdmin
        .from('tickets')
        .update({ status: 'USED', scanned_at: new Date().toISOString() })
        .eq('id', ticket.id);

      return NextResponse.json({
        status: 'VALID',
        message: '✅ ENTRÉE VALIDÉE',
        ticket: { ...ticket, status: 'USED' },
      });
    }

    // 3. Si le billet n'est pas encore en base mais valide (LNR-...)
    if (cleanCode.startsWith('LNR-')) {
      const now = new Date().toISOString();
      const newTicket = {
        ticket_code: cleanCode,
        customer_name: 'Invité Confirmé',
        customer_email: 'Enregistré au scan',
        ticket_type: 'PASS OFFICIEL',
        amount_paid: 20,
        status: 'USED',
        scanned_at: now,
      };

      await supabaseAdmin.from('tickets').insert([newTicket]);

      return NextResponse.json({
        status: 'VALID',
        message: '✅ ENTRÉE VALIDÉE',
        ticket: newTicket,
      });
    }

    return NextResponse.json({
      status: 'INVALID',
      message: '❌ Billet non reconnu',
    });

  } catch (err: any) {
    return NextResponse.json({ status: 'INVALID', message: 'Erreur serveur interne' });
  }
}