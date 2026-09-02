import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Utilisation de la clé SERVICE_ROLE pour contourner les restrictions RLS (sécurité) en lecture
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pin = searchParams.get('pin');

    // Vérification du code PIN (Sécurité basique)
    if (pin !== '8520') {
      return NextResponse.json({ error: 'Accès non autorisé : PIN incorrect' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      throw new Error("Supabase n'est pas correctement configuré sur le serveur.");
    }

    // 1. Récupération de TOUS les billets (sans limite)
    const { data: tickets, error } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur lecture tickets:', error);
      throw error;
    }

    const allTickets = tickets || [];

    // 2. Calcul des statistiques réelles
    const totalSold = allTickets.length;
    
    // On vérifie le statut : soit 'is_scanned' est true, soit le statut texte est 'SCANNED'
    const scannedCount = allTickets.filter(
      (t) => t.is_scanned === true || t.status === 'SCANNED'
    ).length;
    
    const scannedRate = totalSold > 0 ? Math.round((scannedCount / totalSold) * 100) : 0;
    
    // Calcul des revenus (en ignorant les invitations gratuites)
    const totalRevenue = allTickets
      .reduce((sum, t) => sum + (Number(t.amount_paid) || 0), 0)
      .toFixed(2);

    // 3. Renvoi des données formatées
    return NextResponse.json({
      stats: {
        totalSold,
        scannedCount,
        scannedRate,
        totalRevenue
      },
      tickets: allTickets,
    });

  } catch (err: any) {
    console.error('Erreur API Admin GET:', err);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// Route POST pour créer des invitations VIP depuis le dashboard
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pin, holder_name, holder_email, ticket_type } = body;

    if (pin !== '8520') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Génération d'un code unique pour le VIP
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let middle = '';
    for (let i = 0; i < 5; i++) {
      middle += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const ticketCode = `VIP-${middle}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newTicket = {
      ticket_code: ticketCode,
      customer_name: holder_name,
      customer_email: holder_email,
      ticket_type: ticket_type || 'VIP_INVITE',
      amount_paid: 0,
      status: 'VALID',
      is_scanned: false,
      created_at: new Date().toISOString(),
    };

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from('tickets').insert([newTicket]);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, ticket: newTicket });
  } catch (err: any) {
    console.error('Erreur API Admin POST:', err);
    return NextResponse.json({ error: 'Erreur création VIP' }, { status: 500 });
  }
}