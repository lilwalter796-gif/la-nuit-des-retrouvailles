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

    // 1. Vérification PIN Organisateur
    if (pin !== '8520') {
      return NextResponse.json({ status: 'INVALID', message: 'Code PIN incorrect' }, { status: 401 });
    }

    if (!code) {
      return NextResponse.json({ status: 'INVALID', message: 'Aucun code fourni' }, { status: 400 });
    }

    // 2. Nettoyage et normalisation du code
    let rawStr = String(code).trim().replace(/\s+/g, '').toUpperCase();
    if (rawStr.includes('CODE=')) {
      rawStr = rawStr.split('CODE=')[1].split('&')[0];
    } else if (rawStr.includes('/TICKET/')) {
      rawStr = rawStr.split('/TICKET/')[1].split('?')[0];
    }

    const cleanCode = rawStr;
    const now = new Date().toISOString();

    // 3. Recherche dans Supabase de tout billet correspondant
    const { data: tickets, error: searchError } = await supabaseAdmin
      .from('tickets')
      .select('*');

    if (searchError) {
      console.error('Erreur Supabase query:', searchError);
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

    // 4. Si le billet existe déjà en base
    if (existingTicket) {
      const currentStatus = String(existingTicket.status || '').toUpperCase();
      const isAlreadyUsed =
        currentStatus === 'USED' ||
        currentStatus === 'UTILISÉ' ||
        currentStatus === 'UTILISE' ||
        Boolean(existingTicket.scanned_at);

      const ticketDetails = {
        id: existingTicket.id,
        ticket_code: existingTicket.ticket_code || cleanCode,
        customer_name: existingTicket.customer_name || existingTicket.name || 'Invité Officiel',
        customer_email: existingTicket.customer_email || existingTicket.email || 'Vérifié',
        ticket_type: formatTicketType(existingTicket.ticket_type || existingTicket.ticketType),
        amount_paid: existingTicket.amount_paid || 20,
        status: 'USED',
        scanned_at: existingTicket.scanned_at || now,
      };

      // CAS A : LE BILLET A DÉJÀ ÉTÉ UTILISÉ (Peu importe l'heure) -> ALERTE ROUGE
      if (isAlreadyUsed) {
        return NextResponse.json({
          status: 'ALREADY_USED',
          message: '⛔ BILLET DÉJÀ UTILISÉ !',
          ticket: ticketDetails,
          scannedAt: existingTicket.scanned_at || now,
        });
      }

      // CAS B : PREMIER SCAN DU BILLET -> VALIDATION ET MARQUAGE IMMÉDIAT EN "USED"
      await supabaseAdmin
        .from('tickets')
        .update({
          status: 'USED',
          scanned_at: now,
        })
        .eq('id', existingTicket.id);

      return NextResponse.json({
        status: 'VALID',
        message: '✅ ENTRÉE VALIDÉE',
        ticket: { ...ticketDetails, scanned_at: now },
        scannedAt: now,
      });
    }

    // 5. Cas où le pass est un code valide LNR-... scanné pour la toute 1ère fois
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

      const { data: insertedTicket } = await supabaseAdmin
        .from('tickets')
        .insert([newTicketRecord])
        .select()
        .single();

      const saved = insertedTicket || newTicketRecord;

      return NextResponse.json({
        status: 'VALID',
        message: '✅ ENTRÉE VALIDÉE',
        ticket: {
          ...saved,
          ticket_type: formatTicketType(saved.ticket_type),
        },
        scannedAt: now,
      });
    }

    // 6. Si aucun billet ne correspond
    return NextResponse.json({
      status: 'INVALID',
      message: '❌ BILLET NON RECONNU',
    });

  } catch (err: any) {
    console.error('Erreur API Scan:', err);
    return NextResponse.json({ status: 'INVALID', message: 'Erreur interne du serveur' }, { status: 500 });
  }
}