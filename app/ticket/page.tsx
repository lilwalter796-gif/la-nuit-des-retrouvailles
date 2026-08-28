'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import Link from 'next/link';

function TicketContent() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get('code');
  const sessionIdParam = searchParams.get('session_id');

  const [ticket, setTicket] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTicket() {
      try {
        setLoading(true);
        setError(null);

        let query = '';
        if (codeParam) {
          query = `code=${encodeURIComponent(codeParam)}`;
        } else if (sessionIdParam) {
          query = `session_id=${encodeURIComponent(sessionIdParam)}`;
        } else {
          setError('Aucun identifiant de billet fourni.');
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/tickets/verify?${query}`);
        const data = await res.json();

        if (!res.ok || !data.ticket) {
          // Si le webhook Stripe a un délai de quelques secondes, on réessaie 1 fois après 2s
          if (sessionIdParam) {
            await new Promise((r) => setTimeout(r, 2000));
            const retryRes = await fetch(`/api/tickets/verify?${query}`);
            const retryData = await retryRes.json();
            if (retryRes.ok && retryData.ticket) {
              setTicket(retryData.ticket);
              const qr = await QRCode.toDataURL(retryData.ticket.ticket_code, { width: 300, margin: 2 });
              setQrCodeUrl(qr);
              setLoading(false);
              return;
            }
          }
          setError(data.error || 'Billet introuvable.');
          setLoading(false);
          return;
        }

        setTicket(data.ticket);
        const qr = await QRCode.toDataURL(data.ticket.ticket_code, { width: 300, margin: 2 });
        setQrCodeUrl(qr);
      } catch (err: any) {
        setError('Erreur lors du chargement du billet.');
      } finally {
        setLoading(false);
      }
    }

    fetchTicket();
  }, [codeParam, sessionIdParam]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-400">Génération et validation de votre pass sécurisé...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-md w-full text-center">
          <h2 className="text-red-500 text-xl font-bold mb-2">Billet introuvable</h2>
          <p className="text-zinc-400 text-sm mb-6">{error || 'Veuillez vérifier le lien ou consulter vos emails.'}</p>
          <Link href="/" className="inline-block bg-amber-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-amber-400 transition">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="bg-zinc-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl shadow-amber-500/10">
        <div className="inline-block bg-amber-500 text-black text-xs font-black uppercase px-3 py-1 rounded-full mb-4 tracking-wider">
          Pass Officiel Validé
        </div>
        <h1 className="text-2xl font-black uppercase tracking-wide mb-1">La Nuit des Retrouvailles</h1>
        <p className="text-zinc-400 text-xs mb-6">KRATOS & HAPPY D'EFOULAN • PARMA</p>

        {qrCodeUrl && (
          <div className="bg-white p-4 rounded-2xl inline-block mb-6 shadow-inner">
            <img src={qrCodeUrl} alt="QR Code Billet" className="w-56 h-56 mx-auto" />
          </div>
        )}

        <div className="bg-black/50 border border-zinc-800 rounded-xl p-4 text-left space-y-2 text-sm mb-6">
          <div className="flex justify-between border-b border-zinc-800/80 pb-2">
            <span className="text-zinc-500">Participant</span>
            <span className="font-bold text-zinc-200">{ticket.customer_name}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-800/80 pb-2">
            <span className="text-zinc-500">Formule</span>
            <span className="font-bold text-amber-400">{ticket.ticket_type}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-800/80 pb-2">
            <span className="text-zinc-500">Code Pass</span>
            <span className="font-mono font-bold text-zinc-300">{ticket.ticket_code}</span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-zinc-500">Statut</span>
            <span className="text-emerald-400 font-bold uppercase">{ticket.status}</span>
          </div>
        </div>

        <p className="text-xs text-zinc-500 mb-6">
          Présentez ce QR Code directement depuis votre smartphone à l'entrée de la salle.
        </p>

        <Link href="/" className="inline-block w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-3 rounded-xl text-sm transition">
          Retour au site
        </Link>
      </div>
    </div>
  );
}

export default function TicketPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Chargement...</div>}>
      <TicketContent />
    </Suspense>
  );
}