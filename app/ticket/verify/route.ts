import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const sessionId = searchParams.get('session_id');

    if (!code && !sessionId) {
      return NextResponse.json({ error: 'Code ou Session ID manquant' }, { status: 400 });
    }

    let query = supabaseAdmin.from('tickets').select('*');

    if (code) {
      query = query.eq('ticket_code', code);
    } else if (sessionId) {
      query = query.eq('stripe_session_id', sessionId);
    }

    const { data: ticket, error } = await query.maybeSingle();

    if (error || !ticket) {
      return NextResponse.json({ error: 'Billet non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ ticket });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}