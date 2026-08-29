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

    // 1. Nettoyage strict du code (retrait complet des espaces et formatage majuscule)
    let rawStr = String(code).trim().replace(/\s+/g, '').toUpperCase();
    if (rawStr.includes('CODE=')) {
      rawStr = rawStr.split('CODE=')[1].split('&')[0];
    } else if (rawStr.includes('/TICKET/')) {
      rawStr = rawStr.split('/TICKET/')[1].split('?')[0];
    }

    // Extraction de la partie pure du code pass
    const cleanCode = rawStr;

    // 2. Recherche tolérante dans Supabase
    const { data: tickets, error: searchError } = await supabaseAdmin
      .from('tickets')
      .select('*');

    if (searchError) {
      console.error('Erreur Supabase scan query:', searchError);
    }

    // Comparaison locale insensible aux espaces ou tirets
    const normalize = (s: string) => String(s || '').replace(/[\s-_]/g, '').toUpperCase();
    const targetNorm = normalize(cleanCode);

    const existingTicket = tickets?.find((t) => {
      const codeNorm = normalize(t.ticket_code);
      const sessionNorm = normalize(t.stripe_session_id);
      return codeNorm.includes(targetNorm) || targetNorm.includes(codeNorm) || (sessionNorm && sessionNorm === targetNorm);
    });

    const now = new Date().toISOString();

    // 3. Cas : Le billet a DÉJÀ été trouvé et utilisé
    if (existingTicket) {
      const currentStatus = String(existingTicket.status || '').toUpperCase();
      const isUsed = currentStatus === 'USED' || currentStatus === 'UTILISÉ' || currentStatus === 'UTILISE';

      if (isUsed) {
        return NextResponse.json({
          status: 'ALREADY_USED',
          message: '⛔ BILLET DÉJÀ UTILISÉ',
          ticket: existingTicket,
          scannedAt: existingTicket.scanned_at || now,
        });
      }

      // Premier scan du billet existant : on le passe à USED
      await supabaseAdmin
        .from('tickets')
        .update({ status: 'USED', scanned_at: now })
        .eq('id', existingTicket.id);

      return NextResponse.json({
        status: 'VALID',
        message: '✅ ENTRÉE VALIDÉE',
        ticket: { ...existingTicket, status: 'USED', scanned_at: now },
        scannedAt: now,
      });
    }

    // 4. Cas : Premier scan d'un billet valide non présent en base
    if (cleanCode.startsWith('LNR')) {
      const newTicketRecord = {
        ticket_code: cleanCode,
        customer_name: 'Invité Confirmé',
        customer_email: 'Validé sur place',
        ticket_type: 'PASS OFFICIEL',
        amount_paid: 20,
        status: 'USED',
        scanned_at: now,
      };

      const { data: createdTicket } = await supabaseAdmin
        .from('tickets')
        .insert([newTicketRecord])
        .select()
        .single();

      return NextResponse.json({
        status: 'VALID',
        message: '✅ ENTRÉE VALIDÉE',
        ticket: createdTicket || newTicketRecord,
        scannedAt: now,
      });
    }

    return NextResponse.json({
      status: 'INVALID',
      message: '❌ Billet non reconnu',
    });
  } catch (err: any) {
    console.error('Erreur API Scan:', err);
    return NextResponse.json({ status: 'INVALID', message: 'Erreur serveur' });
  }
}