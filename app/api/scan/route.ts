import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

function formatTicketType(type?: string): string {
  if (!type) return 'ENTRÉE SIMPLE + CONSO';
  const t = type.toUpperCase();
  if (t.includes('VIP')) return 'FORMULE VIP INVITÉ';
  if (t.includes('TABLE') || t.includes('BOUTEILLE')) return 'TABLE VIP / BOUTEILLE';
  if (t.includes('PREMIUM')) return 'ENTRÉE PREMIUM';
  return t.replace(/_/g, ' ');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, pin } = body;

    if (pin !== '8520') {
      return NextResponse.json({ status: 'INVALID', message: 'Code PIN incorrect' });
    }

    if (!code) {
      return NextResponse.json({ status: 'INVALID', message: 'Aucun code détecté' });
    }

    let rawStr = String(code).trim().replace(/\s+/g, '').toUpperCase();
    if (rawStr.includes('CODE=')) {
      rawStr = rawStr.split('CODE=')[1].split('&')[0];
    } else if (rawStr.includes('/TICKET/')) {
      rawStr = rawStr.split('/TICKET/')[1].split('?')[0];
    }

    const cleanCode = rawStr;

    // Récupération des billets existants
    const { data: tickets, error: searchError } = await supabaseAdmin
      .from('tickets')
      .select('*');

    if (searchError) {
      console.error('Erreur Supabase scan query:', searchError);
    }

    const normalize = (s: string) => String(s || '').replace(/[\s-_]/g, '').toUpperCase();
    const targetNorm = normalize(cleanCode);

    const existingTicket = tickets?.find((t) => {
      const codeNorm = normalize(t.ticket_code || t.ticketCode);
      const sessionNorm = normalize(t.stripe_session_id || t.sessionId);
      return (
        (codeNorm && (codeNorm.includes(targetNorm) || targetNorm.includes(codeNorm))) ||
        (sessionNorm && sessionNorm === targetNorm)
      );
    });

    const now = new Date().toISOString();

    // Cas 1 : Le billet existe en base
    if (existingTicket) {
      const currentStatus = String(existingTicket.status || '').toUpperCase();
      const isUsed = currentStatus === 'USED' || currentStatus === 'UTILISÉ' || currentStatus === 'UTILISE';

      const formattedTicket = {
        id: existingTicket.id,
        ticket_code: existingTicket.ticket_code || cleanCode,
        customer_name: existingTicket.customer_name || existingTicket.name || 'Invité Officiel',
        customer_email: existingTicket.customer_email || existingTicket.email || 'Email vérifié',
        ticket_type: formatTicketType(existingTicket.ticket_type || existingTicket.ticketType),
        amount_paid: existingTicket.amount_paid || 20,
        status: isUsed ? 'USED' : 'USED',
        scanned_at: existingTicket.scanned_at || now,
      };

      if (isUsed) {
        return NextResponse.json({
          status: 'ALREADY_USED',
          message: '⛔ BILLET DÉJÀ UTILISÉ',
          ticket: formattedTicket,
          scannedAt: existingTicket.scanned_at || now,
        });
      }

      await supabaseAdmin
        .from('tickets')
        .update({ status: 'USED', scanned_at: now })
        .eq('id', existingTicket.id);

      return NextResponse.json({
        status: 'VALID',
        message: '✅ ENTRÉE VALIDÉE',
        ticket: formattedTicket,
        scannedAt: now,
      });
    }

    // Cas 2 : Pass valide LNR- non encore indexé
    if (cleanCode.startsWith('LNR')) {
      const newTicketRecord = {
        ticket_code: cleanCode,
        customer_name: 'Invité Confirmé',
        customer_email: 'Validé sur place',
        ticket_type: 'ENTRÉE SIMPLE + CONSO',
        amount_paid: 20,
        status: 'USED',
        scanned_at: now,
      };

      const { data: createdTicket } = await supabaseAdmin
        .from('tickets')
        .insert([newTicketRecord])
        .select()
        .single();

      const finalTicket = createdTicket || newTicketRecord;

      return NextResponse.json({
        status: 'VALID',
        message: '✅ ENTRÉE VALIDÉE',
        ticket: {
          ...finalTicket,
          ticket_type: formatTicketType(finalTicket.ticket_type),
        },
        scannedAt: now,
      });
    }

    return NextResponse.json({
      status: 'INVALID',
      message: '❌ Billet non reconnu',
    });
  } catch (err: any) {
    console.error('Erreur scan:', err);
    return NextResponse.json({ status: 'INVALID', message: 'Erreur serveur' });
  }
}