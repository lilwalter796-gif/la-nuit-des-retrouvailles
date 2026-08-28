import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

const ADMIN_SECRET = '8520';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pin = searchParams.get('pin');

  if (pin !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 });
  }

  try {
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const normalizedTickets = (tickets || []).map((t) => ({
      ...t,
      holder_name:
        t.holder_name ||
        `${t.holder_first_name || ''} ${t.holder_last_name || ''}`.trim() ||
        'Invité VIP',
      holder_email: t.holder_email || t.email || '-',
    }));

    const totalSold = normalizedTickets.length;
    const scannedCount = normalizedTickets.filter((t) => t.is_scanned).length;
    const totalRevenue = normalizedTickets.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);

    return NextResponse.json({
      tickets: normalizedTickets,
      stats: {
        totalSold,
        scannedCount,
        scannedRate: totalSold > 0 ? Math.round((scannedCount / totalSold) * 100) : 0,
        totalRevenue: (totalRevenue / 100).toFixed(2),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { pin, holder_name, holder_email, ticket_type } = await request.json();

    if (pin !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 });
    }

    if (!holder_name || !holder_email) {
      return NextResponse.json({ error: 'Nom et Email obligatoires' }, { status: 400 });
    }

    const nameParts = holder_name.trim().split(' ');
    const firstName = nameParts[0] || 'Invité';
    const lastName = nameParts.slice(1).join(' ') || '';

    const uniqueId = crypto.randomBytes(3).toString('hex').toUpperCase();
    const ticket_number = `LNR-${uniqueId}-VIP`;
    const qr_token = crypto.randomBytes(16).toString('hex');

    // 1. Lire la structure réelle des colonnes en récupérant 1 ligne témoin
    const { data: sampleRows } = await supabase.from('tickets').select('*').limit(1);
    const availableKeys = sampleRows && sampleRows.length > 0 ? Object.keys(sampleRows[0]) : [];

    // 2. Construire le dictionnaire de correspondances
    const fullPayload: Record<string, any> = {
      ticket_number,
      qr_token,
      holder_name: holder_name.trim(),
      holder_first_name: firstName,
      holder_last_name: lastName,
      holder_email: holder_email.trim().toLowerCase(),
      email: holder_email.trim().toLowerCase(),
      ticket_type: ticket_type || 'VIP_INVITE',
      amount_paid: 0,
      currency: 'eur',
      is_scanned: false,
    };

    // 3. Filtrer pour n'envoyer STRICTEMENT que les colonnes qui existent
    let finalPayload: Record<string, any> = {};
    if (availableKeys.length > 0) {
      for (const key of availableKeys) {
        if (fullPayload[key] !== undefined) {
          finalPayload[key] = fullPayload[key];
        }
      }
    } else {
      // Fallback standard
      finalPayload = {
        ticket_number,
        qr_token,
        holder_first_name: firstName,
        holder_last_name: lastName,
        holder_email: holder_email.trim().toLowerCase(),
        is_scanned: false,
      };
    }

    const { data, error } = await supabase
      .from('tickets')
      .insert([finalPayload])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, ticket: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}