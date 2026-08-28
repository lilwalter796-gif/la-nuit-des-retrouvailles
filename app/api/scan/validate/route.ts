import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { code, pin } = body;

    // Vérification du code PIN du staff
    if (pin !== '8520') {
      return NextResponse.json({ success: false, message: 'Code PIN incorrect' }, { status: 401 });
    }

    if (!code) {
      return NextResponse.json({ success: false, message: 'Aucun code fourni' }, { status: 400 });
    }

    // Nettoyage du code scanné (retire les espaces ou URLs complètes si le scanner a lu l'URL entière)
    let cleanCode = code.trim();
    if (cleanCode.includes('code=')) {
      cleanCode = cleanCode.split('code=')[1].split('&')[0];
    } else if (cleanCode.includes('/ticket/')) {
      cleanCode = cleanCode.split('/ticket/')[1].split('?')[0];
    }

    // 1. Recherche dans Supabase
    const { data: ticket, error: fetchError } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .ilike('ticket_code', cleanCode)
      .maybeSingle();

    if (fetchError) {
      console.error('Erreur Supabase scan:', fetchError);
    }

    // 2. Si le billet existe déjà en base
    if (ticket) {
      if (ticket.status === 'USED' || ticket.status === 'UTILISÉ') {
        return NextResponse.json({
          success: false,
          alreadyUsed: true,
          message: '⚠️ BILLET DÉJÀ UTILISÉ !',
          ticket,
        });
      }

      // Marquer le billet comme utilisé
      await supabaseAdmin
        .from('tickets')
        .update({ status: 'USED', scanned_at: new Date().toISOString() })
        .eq('id', ticket.id);

      return NextResponse.json({
        success: true,
        message: '✅ ENTRÉE VALIDÉE',
        ticket: {
          ...ticket,
          status: 'USED',
        },
      });
    }

    // 3. Fallback : Si le billet commence par LNR- (billet valide généré mais manquant en base)
    if (cleanCode.startsWith('LNR-')) {
      const newTicket = {
        ticket_code: cleanCode,
        customer_name: 'Invité Confirmé',
        customer_email: 'Enregistré sur place',
        ticket_type: 'PASS OFFICIEL',
        amount_paid: 20,
        status: 'USED',
        scanned_at: new Date().toISOString(),
      };

      await supabaseAdmin.from('tickets').insert([newTicket]);

      return NextResponse.json({
        success: true,
        message: '✅ ENTRÉE VALIDÉE (Enregistré)',
        ticket: newTicket,
      });
    }

    return NextResponse.json({
      success: false,
      message: '❌ Billet introuvable / Code invalide',
    }, { status: 404 });

  } catch (err: any) {
    console.error('Erreur serveur scan:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}