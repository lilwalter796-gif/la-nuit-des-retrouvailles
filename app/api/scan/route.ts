import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 🔴 CORRECTION : Initialisation DIRECTE avec la clé d'administration pour FORCER la mise à jour (Bypass RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const dynamic = 'force-dynamic';

// Cache mémoire serveur
const globalUsedTickets = new Map<string, { scannedAt: string; customerName: string; ticketType: string }>();

function normalizeCode(str: string): string {
  return String(str || '').trim().replace(/\s+/g, '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
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

    if (!supabaseAdmin) {
      console.error('Supabase admin non configuré dans le scanner');
      return NextResponse.json({ status: 'INVALID', message: 'Erreur serveur BDD' }, { status: 500 });
    }

    let inputStr = String(code).trim();
    if (inputStr.includes('code=')) {
      inputStr = inputStr.split('code=')[1].split('&')[0];
    } else if (inputStr.includes('/ticket/')) {
      inputStr = inputStr.split('/ticket/')[1].split('?')[0];
    }

    const cleanCode = normalizeCode(inputStr);
    const now = new Date().toISOString();

    // 1. CONTRÔLE MÉMOIRE
    if (globalUsedTickets.has(cleanCode)) {
      const cached = globalUsedTickets.get(cleanCode)!;
      return NextResponse.json({
        status: 'ALREADY_USED',
        message: '⛔ BILLET DÉJÀ UTILISÉ !',
        ticket: {
          ticket_number: cleanCode,
          holder_name: cached.customerName,
          ticket_type: cached.ticketType,
          status: 'USED',
          scanned_at: cached.scannedAt,
        },
        scannedAt: cached.scannedAt,
      });
    }

    // 2. CONTRÔLE SUPABASE
    const { data: existingTicket, error: fetchErr } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .or(`ticket_code.ilike.${cleanCode},ticket_number.ilike.${cleanCode}`)
      .maybeSingle();

    if (fetchErr) {
      console.error('Erreur Supabase Scan Query:', fetchErr);
    }

    if (existingTicket) {
      const statusUpper = String(existingTicket.status || '').toUpperCase();
      const alreadyScanned = statusUpper === 'USED' || statusUpper === 'SCANNED' || existingTicket.is_scanned === true || Boolean(existingTicket.scanned_at);

      if (alreadyScanned) {
        const firstScanTime = existingTicket.scanned_at || now;
        globalUsedTickets.set(cleanCode, {
          scannedAt: firstScanTime,
          customerName: existingTicket.holder_name || existingTicket.customer_name || 'Invité',
          ticketType: existingTicket.ticket_type || 'PASS',
        });

        return NextResponse.json({
          status: 'ALREADY_USED',
          message: '⛔ BILLET DÉJÀ UTILISÉ !',
          ticket: {
            ...existingTicket,
            status: 'USED',
            is_scanned: true,
            scanned_at: firstScanTime,
          },
          scannedAt: firstScanTime,
        });
      }

      // 🔴 MISE A JOUR FORCÉE DANS SUPABASE
      const matchCol = existingTicket.ticket_number ? 'ticket_number' : 'ticket_code';
      const matchVal = existingTicket.ticket_number || existingTicket.ticket_code;

      const { error: updateErr } = await supabaseAdmin
        .from('tickets')
        .update({ status: 'USED', is_scanned: true, scanned_at: now })
        .eq(matchCol, matchVal);

      if (updateErr) {
        console.error('Erreur critique validation Supabase:', updateErr);
      }

      globalUsedTickets.set(cleanCode, {
        scannedAt: now,
        customerName: existingTicket.holder_name || existingTicket.customer_name || 'Invité VIP',
        ticketType: existingTicket.ticket_type || 'PASS',
      });

      return NextResponse.json({
        status: 'VALID',
        message: '✅ ENTRÉE VALIDÉE',
        ticket: {
          ...existingTicket,
          status: 'USED',
          is_scanned: true,
          scanned_at: now,
        },
        scannedAt: now,
      });
    }

    // 3. FALLBACK D'URGENCE LNR & VIP
    if (cleanCode.startsWith('LNR') || cleanCode.startsWith('VIP')) {
      const newTicket = {
        ticket_number: cleanCode,
        qr_token: cleanCode,
        holder_name: cleanCode.startsWith('VIP') ? 'Invité VIP' : 'Acheteur Confirmé',
        holder_email: 'Validé sur place',
        ticket_type: cleanCode.startsWith('VIP') ? 'VIP_INVITE' : 'PASS OFFICIEL',
        amount_paid: cleanCode.startsWith('VIP') ? 0 : 20,
        status: 'USED',
        is_scanned: true,
        scanned_at: now,
      };

      await supabaseAdmin.from('tickets').insert([newTicket]);

      globalUsedTickets.set(cleanCode, {
        scannedAt: now,
        customerName: newTicket.holder_name,
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