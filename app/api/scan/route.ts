import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Cache mémoire serveur haute performance (persistance immédiate pendant toute la soirée)
const globalUsedTickets = new Map<string, { scannedAt: string; customerName: string; ticketType: string }>();

function normalizeCode(str: string): string {
  return String(str || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, pin } = body;

    if (pin !== '8520') {
      return NextResponse.json({ status: 'INVALID', message: 'Code PIN incorrect' }, { status: 401 });
    }

    if (!code) {
      return NextResponse.json({ status: 'INVALID', message: 'Aucun code fourni' }, { status: 400 });
    }

    // 1. Extraction et nettoyage strict du code
    let inputStr = String(code).trim();
    if (inputStr.includes('code=')) {
      inputStr = inputStr.split('code=')[1].split('&')[0];
    } else if (inputStr.includes('/ticket/')) {
      inputStr = inputStr.split('/ticket/')[1].split('?')[0];
    }

    const cleanCode = normalizeCode(inputStr);
    const now = new Date().toISOString();

    // 2. CONTRÔLE 1 : Vérification immédiate dans le cache mémoire serveur
    if (globalUsedTickets.has(cleanCode)) {
      const cached = globalUsedTickets.get(cleanCode)!;
      return NextResponse.json({
        status: 'ALREADY_USED',
        message: '⛔ BILLET DÉJÀ UTILISÉ !',
        ticket: {
          ticket_code: cleanCode,
          customer_name: cached.customerName,
          ticket_type: cached.ticketType,
          status: 'USED',
          scanned_at: cached.scannedAt,
        },
        scannedAt: cached.scannedAt,
      });
    }

    // 3. CONTRÔLE 2 : Vérification dans Supabase
    const { data: existingTicket, error: fetchErr } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .ilike('ticket_code', cleanCode)
      .maybeSingle();

    if (fetchErr) {
      console.error('Erreur Supabase Scan Query:', fetchErr);
    }

    if (existingTicket) {
      const statusUpper = String(existingTicket.status || '').toUpperCase();
      const alreadyScanned = statusUpper === 'USED' || Boolean(existingTicket.scanned_at);

      if (alreadyScanned) {
        const firstScanTime = existingTicket.scanned_at || now;
        globalUsedTickets.set(cleanCode, {
          scannedAt: firstScanTime,
          customerName: existingTicket.customer_name || 'Invité Confirmé',
          ticketType: existingTicket.ticket_type || 'PASS OFFICIEL',
        });

        return NextResponse.json({
          status: 'ALREADY_USED',
          message: '⛔ BILLET DÉJÀ UTILISÉ !',
          ticket: {
            ...existingTicket,
            ticket_code: cleanCode,
            status: 'USED',
            scanned_at: firstScanTime,
          },
          scannedAt: firstScanTime,
        });
      }

      // Marquer le billet comme utilisé dans Supabase
      await supabaseAdmin
        .from('tickets')
        .update({ status: 'USED', scanned_at: now })
        .eq('id', existingTicket.id);

      // Enregistrer dans le cache mémoire
      globalUsedTickets.set(cleanCode, {
        scannedAt: now,
        customerName: existingTicket.customer_name || 'Invité VIP',
        ticketType: existingTicket.ticket_type || 'PASS OFFICIEL',
      });

      return NextResponse.json({
        status: 'VALID',
        message: '✅ ENTRÉE VALIDÉE',
        ticket: {
          ...existingTicket,
          status: 'USED',
          scanned_at: now,
        },
        scannedAt: now,
      });
    }

    // 4. CONTRÔLE 3 : Billet au format valide LNR- non encore en base (Premier Scan)
    if (cleanCode.startsWith('LNR')) {
      const newTicket = {
        ticket_code: cleanCode,
        customer_name: 'Invité Confirmé',
        customer_email: 'Validé sur place',
        ticket_type: 'PASS OFFICIEL',
        amount_paid: 20,
        status: 'USED',
        scanned_at: now,
      };

      // Enregistrement dans Supabase
      await supabaseAdmin.from('tickets').insert([newTicket]);

      // Verrouillage instantané en mémoire
      globalUsedTickets.set(cleanCode, {
        scannedAt: now,
        customerName: newTicket.customer_name,
        ticketType: newTicket.ticket_type,
      });

      return NextResponse.json({
        status: 'VALID',
        message: '✅ ENTRÉE VALIDÉE',
        ticket: newTicket,
        scannedAt: now,
      });
    }

    return NextResponse.json({
      status: 'INVALID',
      message: '❌ BILLET INCONNU',
    });

  } catch (err: any) {
    console.error('Erreur API Scan:', err);
    return NextResponse.json({ status: 'INVALID', message: 'Erreur serveur interne' }, { status: 500 });
  }
}