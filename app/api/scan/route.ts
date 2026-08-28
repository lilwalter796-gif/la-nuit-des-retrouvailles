import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, pin } = body;

    // 1. PIN de sécurité
    if (pin !== '8520') {
      return NextResponse.json({ success: false, message: 'Code PIN incorrect' }, { status: 401 });
    }

    if (!code) {
      return NextResponse.json({ success: false, message: 'Aucun code détecté' }, { status: 400 });
    }

    let inputStr = String(code).trim();
    let searchCode = inputStr;
    let searchSessionId = '';

    // Extraction si le QR code contient une URL
    if (inputStr.includes('http://') || inputStr.includes('https://')) {
      try {
        const parsedUrl = new URL(inputStr);
        searchCode = parsedUrl.searchParams.get('code') || '';
        searchSessionId = parsedUrl.searchParams.get('session_id') || '';
      } catch (e) {
        // Fallback découpage manuel
        if (inputStr.includes('code=')) {
          searchCode = inputStr.split('code=')[1].split('&')[0];
        }
        if (inputStr.includes('session_id=')) {
          searchSessionId = inputStr.split('session_id=')[1].split('&')[0];
        }
      }
    }

    // 2. Recherche dans Supabase par code ou par session_id
    let query = supabaseAdmin.from('tickets').select('*');
    
    if (searchCode && searchSessionId) {
      query = query.or(`ticket_code.ilike.${searchCode},stripe_session_id.eq.${searchSessionId}`);
    } else if (searchCode) {
      query = query.ilike('ticket_code', searchCode);
    } else if (searchSessionId) {
      query = query.eq('stripe_session_id', searchSessionId);
    } else {
      query = query.ilike('ticket_code', inputStr);
    }

    const { data: ticket, error: fetchError } = await query.maybeSingle();

    if (fetchError) {
      console.error('Erreur Supabase scan:', fetchError);
    }

    // 3. Cas A : Le billet existe en base
    if (ticket) {
      const isAlreadyUsed = 
        ticket.status === 'USED' || 
        ticket.status === 'UTILISÉ' || 
        ticket.status === 'UTILISE';

      if (isAlreadyUsed) {
        return NextResponse.json({
          success: false,
          alreadyUsed: true,
          message: '⚠️ BILLET DÉJÀ UTILISÉ !',
          ticket,
        });
      }

      // Marquer comme USED
      const now = new Date().toISOString();
      await supabaseAdmin
        .from('tickets')
        .update({ status: 'USED', scanned_at: now })
        .eq('id', ticket.id);

      return NextResponse.json({
        success: true,
        alreadyUsed: false,
        message: '✅ ENTRÉE VALIDÉE',
        ticket: { ...ticket, status: 'USED', scanned_at: now },
      });
    }

    // 4. Cas B : Billet généré mais pas encore présent dans la table tickets
    const finalCode = searchCode || inputStr;
    if (finalCode.startsWith('LNR-')) {
      const now = new Date().toISOString();
      const { data: insertedTicket } = await supabaseAdmin
        .from('tickets')
        .insert([
          {
            ticket_code: finalCode,
            customer_name: 'Invité Confirmé',
            customer_email: 'Enregistré au scan',
            ticket_type: 'PASS OFFICIEL',
            amount_paid: 20,
            status: 'USED',
            scanned_at: now,
          },
        ])
        .select()
        .single();

      return NextResponse.json({
        success: true,
        alreadyUsed: false,
        message: '✅ ENTRÉE VALIDÉE',
        ticket: insertedTicket || { ticket_code: finalCode, customer_name: 'Invité Confirmé', status: 'USED' },
      });
    }

    // 5. Code inconnu
    return NextResponse.json({
      success: false,
      alreadyUsed: false,
      message: '❌ Billet introuvable / Code invalide',
    });

  } catch (err: any) {
    console.error('Erreur serveur API Scan:', err);
    return NextResponse.json({ success: false, message: 'Erreur serveur interne' }, { status: 500 });
  }
}