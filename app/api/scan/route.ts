import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, pin } = body;

    // 1. Vérification PIN
    if (pin !== '8520') {
      return NextResponse.json({ success: false, message: 'Code PIN incorrect' }, { status: 401 });
    }

    if (!code) {
      return NextResponse.json({ success: false, message: 'Aucun code fourni' }, { status: 400 });
    }

    // 2. Nettoyage du code
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
      console.error('Erreur lecture Supabase:', fetchError);
    }

    // 4. Si le billet existe déjà en base
    if (ticket) {
      const isAlreadyUsed =
        ticket.status?.toUpperCase() === 'USED' ||
        ticket.status?.toUpperCase() === 'UTILISÉ' ||
        ticket.status?.toUpperCase() === 'UTILISE';

      if (isAlreadyUsed) {
        const scanTime = ticket.scanned_at
          ? new Date(ticket.scanned_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          : 'précédemment';

        return NextResponse.json({
          success: false,
          alreadyUsed: true,
          message: `⚠️ BILLET DÉJÀ UTILISÉ (Scanné à ${scanTime})`,
          ticket,
        });
      }

      // Marquer comme USED avec horodatage
      const now = new Date().toISOString();
      const { error: updateError } = await supabaseAdmin
        .from('tickets')
        .update({ status: 'USED', scanned_at: now })
        .eq('id', ticket.id);

      if (updateError) {
        console.error('Erreur mise à jour statut:', updateError);
      }

      return NextResponse.json({
        success: true,
        alreadyUsed: false,
        message: '✅ ENTRÉE VALIDÉE',
        ticket: { ...ticket, status: 'USED', scanned_at: now },
      });
    }

    // 5. Si non trouvé mais format valide (Fallback LNR-)
    if (cleanCode.startsWith('LNR-')) {
      const now = new Date().toISOString();
      const newTicket = {
        ticket_code: cleanCode,
        customer_name: 'Invité Confirmé',
        customer_email: 'Validé à l\'entrée',
        ticket_type: 'PASS OFFICIEL',
        amount_paid: 20,
        status: 'USED',
        scanned_at: now,
      };

      await supabaseAdmin.from('tickets').insert([newTicket]);

      return NextResponse.json({
        success: true,
        alreadyUsed: false,
        message: '✅ ENTRÉE VALIDÉE (Enregistré)',
        ticket: newTicket,
      });
    }

    return NextResponse.json({
      success: false,
      alreadyUsed: false,
      message: '❌ Billet introuvable / Code non valide',
    });
  } catch (err: any) {
    console.error('Erreur scan API:', err);
    return NextResponse.json({ success: false, message: 'Erreur serveur interne' }, { status: 500 });
  }
}