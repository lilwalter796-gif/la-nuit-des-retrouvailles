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

    // Nettoyage complet : retrait de TOUS les espaces, conversion majuscules
    let rawStr = String(code).replace(/\s+/g, '').toUpperCase();

    if (rawStr.includes('CODE=')) {
      rawStr = rawStr.split('CODE=')[1].split('&')[0];
    } else if (rawStr.includes('/TICKET/')) {
      rawStr = rawStr.split('/TICKET/')[1].split('?')[0];
    }

    // 1. Recherche par code exact ou variations O / 0
    const codeVariant1 = rawStr;
    const codeVariant2 = rawStr.replace(/O/g, '0');
    const codeVariant3 = rawStr.replace(/0/g, 'O');

    const { data: ticket, error: fetchError } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .or(`ticket_code.eq.${codeVariant1},ticket_code.eq.${codeVariant2},ticket_code.eq.${codeVariant3}`)
      .maybeSingle();

    if (fetchError) {
      console.error('Erreur Supabase:', fetchError);
    }

    // 2. Si le billet existe déjà en base
    if (ticket) {
      const isUsed = String(ticket.status).toUpperCase() === 'USED';

      if (isUsed) {
        return NextResponse.json({
          status: 'ALREADY_USED',
          message: '⛔ BILLET DÉJÀ UTILISÉ',
          ticket,
          scannedAt: ticket.scanned_at || new Date().toISOString(),
        });
      }

      const now = new Date().toISOString();
      await supabaseAdmin
        .from('tickets')
        .update({ status: 'USED', scanned_at: now })
        .eq('id', ticket.id);

      return NextResponse.json({
        status: 'VALID',
        message: '✅ ENTRÉE VALIDÉE',
        ticket: { ...ticket, status: 'USED', scanned_at: now },
        scannedAt: now,
      });
    }

    // 3. Si le billet commence par LNR- et est scanné pour la première fois
    if (rawStr.startsWith('LNR-')) {
      const now = new Date().toISOString();
      const newTicket = {
        ticket_code: rawStr,
        customer_name: 'Invité Confirmé',
        customer_email: 'Validé sur place',
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
        scannedAt: now,
      });
    }

    return NextResponse.json({
      status: 'INVALID',
      message: '❌ Billet non reconnu',
    });

  } catch (err: any) {
    console.error('Erreur route scan:', err);
    return NextResponse.json({ status: 'INVALID', message: 'Erreur serveur' });
  }
}