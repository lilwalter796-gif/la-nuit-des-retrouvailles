import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { qrToken, scannerPin, scannerName } = body;

    console.log('--- NOUVEAU SCAN REÇU ---');
    console.log('Donnée brute reçue:', qrToken);

    if (scannerPin !== '8520') {
      return NextResponse.json(
        { success: false, code: 'UNAUTHORIZED', message: 'Code PIN incorrect' },
        { status: 401 }
      );
    }

    if (!qrToken) {
      return NextResponse.json(
        { success: false, code: 'EMPTY', message: 'Scan vide' },
        { status: 400 }
      );
    }

    const raw = String(qrToken).trim();
    // Extrait le token s'il s'agit d'une URL
    const cleanToken = raw.includes('/') ? raw.split('/').filter(Boolean).pop() || raw : raw;

    console.log('Valeur nettoyée pour recherche:', cleanToken);

    // 1. Récupération de tous les billets pour comparaison fiable
    const { data: tickets, error: fetchError } = await supabase
      .from('tickets')
      .select('*');

    if (fetchError) {
      console.error('Erreur Supabase fetch:', fetchError);
      return NextResponse.json(
        { success: false, code: 'DB_ERROR', message: `Erreur Supabase: ${fetchError.message}` },
        { status: 500 }
      );
    }

    console.log(`Billets trouvés en base: ${tickets?.length || 0}`);

    // 2. Recherche ciblée sur tous les champs possibles
    const targetTicket = tickets?.find((t) => {
      const matchNumber = t.ticket_number && (t.ticket_number.trim() === cleanToken || raw.includes(t.ticket_number.trim()));
      const matchToken = t.qr_token && (t.qr_token.trim() === cleanToken || raw.includes(t.qr_token.trim()));
      const matchId = t.id && String(t.id) === cleanToken;
      return matchNumber || matchToken || matchId;
    });

    if (!targetTicket) {
      console.log('Aucun billet correspondant pour:', cleanToken);
      return NextResponse.json({
        success: false,
        code: 'NOT_FOUND',
        message: `Billet non trouvé dans la base. Reçu: "${cleanToken}"`,
      });
    }

    console.log('Billet identifié:', targetTicket.ticket_number, '| Déjà scanné ?', targetTicket.is_scanned);

    // 3. Vérification si déjà scanné
    if (targetTicket.is_scanned) {
      return NextResponse.json({
        success: false,
        code: 'ALREADY_USED',
        holder: targetTicket.holder_name || 'Invité',
        ticket_number: targetTicket.ticket_number,
        scanned_at: targetTicket.scanned_at,
        message: 'Ce billet a déjà été utilisé pour entrer',
      });
    }

    // 4. Mise à jour dans Supabase
    const scannedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        is_scanned: true,
        scanned_at: scannedAt,
        scanned_by: scannerName || 'Scanner Smartphone',
      })
      .eq('id', targetTicket.id);

    if (updateError) {
      console.error('Erreur Supabase update:', updateError);
      return NextResponse.json(
        { success: false, code: 'UPDATE_FAILED', message: updateError.message },
        { status: 500 }
      );
    }

    console.log('Billet validé avec succès !');

    return NextResponse.json({
      success: true,
      code: 'VALID',
      holder: targetTicket.holder_name || 'Invité',
      ticket_number: targetTicket.ticket_number,
      ticket_type: targetTicket.ticket_type || 'STANDARD',
      message: 'Accès autorisé',
    });
  } catch (err: any) {
    console.error('Erreur serveur scan:', err);
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: err?.message || 'Erreur interne' },
      { status: 500 }
    );
  }
}