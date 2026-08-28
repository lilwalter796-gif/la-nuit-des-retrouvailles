import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import QRCode from 'qrcode';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TicketPage(props: Props) {
  const searchParams = await props.searchParams;
  const rawCode = searchParams?.code;
  const rawSessionId = searchParams?.session_id;

  const code = typeof rawCode === 'string' ? rawCode : Array.isArray(rawCode) ? rawCode[0] : undefined;
  const sessionId = typeof rawSessionId === 'string' ? rawSessionId : Array.isArray(rawSessionId) ? rawSessionId[0] : undefined;

  if (!code && !sessionId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-md w-full text-center">
          <h2 className="text-red-500 text-xl font-bold mb-2">Billet introuvable</h2>
          <p className="text-zinc-400 text-sm mb-6">Aucun identifiant fourni.</p>
          <Link href="/" className="inline-block bg-amber-500 text-black font-bold px-6 py-3 rounded-xl">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  let ticket: any = null;

  try {
    if (code) {
      const { data } = await supabaseAdmin.from('tickets').select('*').eq('ticket_code', code).maybeSingle();
      if (data) ticket = data;
    } else if (sessionId) {
      const { data } = await supabaseAdmin.from('tickets').select('*').eq('stripe_session_id', sessionId).maybeSingle();
      if (data) ticket = data;
    }

    if (!ticket && sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session) {
        const customerEmail = session.customer_details?.email || 'client@evenement.com';
        const customerName = session.customer_details?.name || session.metadata?.customer_name || 'Invité VIP';
        const ticketType = session.metadata?.ticket_type || 'ENTRÉE SIMPLE + CONSO';
        const ticketCode = `LNR-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Date.now().toString().slice(-4)}`;
        const amountPaid = (session.amount_total || 2000) / 100;

        ticket = {
          ticket_code: ticketCode,
          customer_name: customerName,
          customer_email: customerEmail,
          ticket_type: ticketType,
          amount_paid: amountPaid,
          status: 'VALID',
        };

        await supabaseAdmin.from('tickets').insert([
          {
            ticket_code: ticketCode,
            stripe_session_id: session.id,
            customer_email: customerEmail,
            customer_name: customerName,
            ticket_type: ticketType,
            amount_paid: amountPaid,
            status: 'VALID',
          },
        ]);
      }
    }
  } catch (err: any) {
    console.error('Erreur Serveur:', err);
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-md w-full text-center">
          <h2 className="text-red-500 text-xl font-bold mb-2">Billet introuvable</h2>
          <p className="text-zinc-400 text-sm mb-6">Impossible de charger les informations de ce pass.</p>
          <Link href="/" className="inline-block bg-amber-500 text-black font-bold px-6 py-3 rounded-xl">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  // Déclencher l'envoi d'email via la route API en interne
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://la-nuit-des-retrouvailles.vercel.app';
  if (ticket.customer_email && process.env.RESEND_API_KEY) {
    fetch(`${siteUrl}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail: ticket.customer_email,
        customerName: ticket.customer_name,
        ticketCode: ticket.ticket_code,
        ticketType: ticket.ticket_type,
      }),
    }).catch((e) => console.error('Erreur auto-envoi:', e));
  }

  const qrCodeDataUrl = await QRCode.toDataURL(ticket.ticket_code, {
    width: 320,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="bg-zinc-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase px-3.5 py-1.5 rounded-full mb-5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Billet Officiel Validé
        </div>

        <h1 className="text-2xl font-black uppercase tracking-wider text-white mb-1">
          La Nuit des Retrouvailles
        </h1>
        <p className="text-amber-400 font-semibold text-xs tracking-widest uppercase mb-6">
          17 OCTOBRE 2026 • PARMA
        </p>

        {/* QR CODE */}
        <div className="bg-white p-4 rounded-2xl inline-block mb-6 shadow-xl">
          <img src={qrCodeDataUrl} alt={`QR Code ${ticket.ticket_code}`} className="w-56 h-56 mx-auto rounded-lg" />
        </div>

        {/* DETAILS TABLE */}
        <div className="bg-black/60 border border-zinc-800 rounded-2xl p-4 text-left space-y-3 text-sm mb-6">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-2.5">
            <span className="text-zinc-500 text-xs uppercase font-medium">Participant</span>
            <span className="font-bold text-zinc-100">{ticket.customer_name}</span>
          </div>

          <div className="flex justify-between items-center border-b border-zinc-800 pb-2.5">
            <span className="text-zinc-500 text-xs uppercase font-medium">Email</span>
            <span className="font-medium text-zinc-300 text-xs">{ticket.customer_email}</span>
          </div>

          <div className="flex justify-between items-center border-b border-zinc-800 pb-2.5">
            <span className="text-zinc-500 text-xs uppercase font-medium">Formule</span>
            <span className="font-bold text-amber-400">{ticket.ticket_type}</span>
          </div>

          <div className="flex justify-between items-center border-b border-zinc-800 pb-2.5">
            <span className="text-zinc-500 text-xs uppercase font-medium">Code Pass</span>
            <span className="font-mono font-bold text-white tracking-wider">{ticket.ticket_code}</span>
          </div>

          <div className="flex justify-between items-center pt-0.5">
            <span className="text-zinc-500 text-xs uppercase font-medium">Statut</span>
            <span className="text-emerald-400 font-black text-xs uppercase bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md">
              {ticket.status || 'VALIDE'}
            </span>
          </div>
        </div>

        <p className="text-zinc-500 text-xs mb-6">
          Présentez ce QR Code à l'entrée de la salle le 17 octobre 2026.
        </p>

        <Link
          href="/"
          className="inline-block w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-3.5 rounded-xl text-sm transition"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}