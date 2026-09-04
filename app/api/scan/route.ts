import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialisation DIRECTE avec la clé d'administration pour FORCER la mise à jour
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    // 2. RECHERCHE SÉCURISÉE (SÉPARÉE POUR ÉVITER LE CRASH SQL)
    let existingTicket = null;
    
    // Essai 1 : Recherche sur ticket_number
    const { data: t1 } = await supabaseAdmin.from('tickets').select('*').ilike('ticket_number', cleanCode).maybeSingle();
    if (t1) {
      existingTicket = t1;
    } else {
      // Essai 2 : Recherche sur qr_token
      const { data: t2 } = await supabaseAdmin.from('tickets').select('*').ilike('qr_token', cleanCode).maybeSingle();
      if (t2) {
        existingTicket = t2;
      } else {
        // Essai 3 : Recherche sur l'ancienne colonne (on ignore l'erreur si elle a été supprimée)
        const { data: t3 } = await supabaseAdmin.from('tickets').select('*').ilike('ticket_code', cleanCode).maybeSingle();
        if (t3) {
          existingTicket = t3;
        }
      }
    }

    // 3. SI LE BILLET A ÉTÉ TROUVÉ
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

      // MISE A JOUR FORCÉE DANS SUPABASE PAR L'ID UNIQUE
      const { error: updateErr } = await supabaseAdmin
        .from('tickets')
        .update({ status: 'USED', is_scanned: true })
        .eq('id', existingTicket.id); 

      if (updateErr) {
        return NextResponse.json({ status: 'INVALID', message: `❌ ERREUR UPDATE BDD : ${updateErr.message}` });
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

    // 4. FALLBACK D'URGENCE LNR & VIP (SI LE BILLET N'EXISTE VRAIMENT PAS)
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
      };

      const { error: insertErr } = await supabaseAdmin.from('tickets').insert([newTicket]);
      
      if (insertErr) {
          return NextResponse.json({ status: 'INVALID', message: `❌ ERREUR INSERTION BDD : ${insertErr.message}` });
      }

      globalUsedTickets.set(cleanCode, {
        scannedAt: now,
        customerName: newTicket.holder_name,
        ticketType: newTicket.ticket_type,
      });

      return NextResponse.json({
        status: 'VALID',
        message: '✅ ENTRÉE VALIDÉE (Créé sur place)',
        ticket: { ...newTicket, scanned_at: now },
        scannedAt: now,
      });
    }

    return NextResponse.json({
      status: 'INVALID',
      message: '❌ BILLET INCONNU',
    });

  } catch (err: any) {
    console.error('Erreur API Scan:', err);
    return NextResponse.json({ status: 'INVALID', message: `Erreur serveur interne: ${err.message}` }, { status: 500 });
  }
}