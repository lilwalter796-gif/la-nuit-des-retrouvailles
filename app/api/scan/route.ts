import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { code, pin } = body;

    // 1. Vérification du PIN
    if (pin !== '8520') {
      return NextResponse.json({ success: false, message: 'Code PIN incorrect' }, { status: 401 });
    }

    if (!code) {
      return NextResponse.json({ success: false, message: 'Aucun code fourni' }, { status: 400 });
    }

    // 2. Nettoyage du code scanné
    let cleanCode = String(code).trim();
    if (cleanCode.includes('code=')) {
      cleanCode = cleanCode.split('code=')[1].split('&')[0];
    } else if (cleanCode.includes('/ticket/')) {
      cleanCode = cleanCode.split('/ticket/')[1].split('?')[0];
    }

    // 3. Recherche dans Supabase
    const { data: ticket, error: fetchError } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .ilike('ticket_code', cleanCode)
      .maybeSingle();

    if (fetchError) {
      console.error('Erreur Supabase scan:', fetchError);
    }

    // 4. Si le billet existe dans Supabase
    if (ticket) {
      if (ticket.status === 'USED' || ticket.status === 'UTILISÉ') {
        return NextResponse.json({
          success: false,
          alreadyUsed: true,
          message: '⚠️ BILLET DÉJÀ UTILISÉ !',
          ticket,
        });
      }

      await supabaseAdmin
        .from('tickets')
        .update({ status: 'USED', scanned_at: new Date().toISOString() })
        .eq('id', ticket.id);

      return NextResponse.json({
        success: true,
        message: '✅ ENTRÉE VALIDÉE',
        ticket: { ...ticket, status: 'USED' },
      });
    }

    // 5. Fallback automatique si le billet commence par LNR-
    if (cleanCode.startsWith('LNR-')) {
      const newTicket = {
        ticket_code: cleanCode,
        customer_name: 'Invité Confirmé',
        customer_email: 'Validé à l\'entrée',
        ticket_type: 'PASS OFFICIEL',
        amount_paid: 20,
        status: 'USED',
        scanned_at: new Date().toISOString(),
      };

      await supabaseAdmin.from('tickets').insert([newTicket]);

      return NextResponse.json({
        success: true,
        message: '✅ ENTRÉE VALIDÉE',
        ticket: newTicket,
      });
    }

    return NextResponse.json({
      success: false,
      message: '❌ Billet introuvable / Code invalide',
    });

  } catch (err: any) {
    console.error('Erreur API Scan:', err);
    return NextResponse.json({ success: false, message: 'Erreur serveur interne' }, { status: 500 });
  }
}