import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, pin } = body;

    if (pin !== '8520') return NextResponse.json({ status: 'INVALID', message: 'Code PIN incorrect' }, { status: 401 });
    if (!code) return NextResponse.json({ status: 'INVALID', message: 'Aucun code fourni' }, { status: 400 });
    if (!supabaseAdmin) return NextResponse.json({ status: 'INVALID', message: 'Erreur BDD serveur' }, { status: 500 });

    let inputStr = String(code).trim();
    if (inputStr.includes('code=')) inputStr = inputStr.split('code=')[1].split('&')[0];
    else if (inputStr.includes('/ticket/')) inputStr = inputStr.split('/ticket/')[1].split('?')[0];

    const cleanCode = inputStr.replace(/\s+/g, '').toUpperCase().replace(/[^A-Z0-9-]/g, '');

    // 1. RECHERCHE DU BILLET (On récupère tout, y compris l'ID unique)
    const { data: existingTicket, error: fetchErr } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .or(`ticket_code.ilike.${cleanCode},ticket_number.ilike.${cleanCode},qr_token.ilike.${cleanCode}`)
      .maybeSingle();

    if (!existingTicket) {
      return NextResponse.json({ status: 'INVALID', message: '❌ BILLET INCONNU' });
    }

    // 2. VÉRIFICATION DU STATUT
    const statusUpper = String(existingTicket.status || '').toUpperCase();
    if (statusUpper === 'USED' || existingTicket.is_scanned === true) {
      return NextResponse.json({ status: 'ALREADY_USED', message: '⛔ BILLET DÉJÀ UTILISÉ !', ticket: existingTicket });
    }

    // 3. LA CORRECTION ABSOLUE : MISE À JOUR PAR L'ID UNIQUE DE LA LIGNE
    // On ne devine plus la colonne, on utilise l'ID de la base de données
    const { error: updateErr } = await supabaseAdmin
      .from('tickets')
      .update({ status: 'USED', is_scanned: true })
      .eq('id', existingTicket.id);

    if (updateErr) {
      return NextResponse.json({ status: 'INVALID', message: `❌ ERREUR BDD : ${updateErr.message}` });
    }

    return NextResponse.json({
      status: 'VALID',
      message: '✅ ENTRÉE VALIDÉE',
      ticket: { ...existingTicket, status: 'USED', is_scanned: true }
    });

  } catch (err: any) {
    return NextResponse.json({ status: 'INVALID', message: `Erreur interne: ${err.message}` }, { status: 500 });
  }
}