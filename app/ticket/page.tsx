"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { Wine, MapPin, Download, ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function TicketContent() {
  const searchParams = useSearchParams();
  const queryToken = searchParams.get('token') || searchParams.get('id') || '';

  const [ticket, setTicket] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let rawToken = queryToken;
    if (!rawToken && typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts.length > 1 && parts[0] === 'ticket') {
        rawToken = parts[parts.length - 1];
      }
    }

    if (!rawToken) {
      setError('Aucun identifiant de billet fourni.');
      setLoading(false);
      return;
    }

    const fetchTicket = async () => {
      try {
        setLoading(true);
        const cleanToken = decodeURIComponent(rawToken).trim();

        const { data: tickets, error: dbError } = await supabase
          .from('tickets')
          .select('*');

        if (dbError) throw dbError;

        const found = tickets?.find((t) => {
          return (
            (t.qr_token && (t.qr_token === cleanToken || cleanToken.includes(t.qr_token))) ||
            (t.ticket_number && (t.ticket_number === cleanToken || cleanToken.includes(t.ticket_number))) ||
            (t.id && String(t.id) === cleanToken)
          );
        });

        if (!found) {
          setError(`Billet non trouvé pour l'identifiant : ${cleanToken}`);
          return;
        }

        setTicket(found);

        const codeToEncode = found.qr_token || found.ticket_number;
        const qrUrl = await QRCode.toDataURL(codeToEncode, {
          width: 320,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        });
        setQrDataUrl(qrUrl);
      } catch (err: any) {
        setError(err.message || 'Erreur lors du chargement.');
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [queryToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 font-sans">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-3" />
        <p className="text-xs uppercase tracking-widest text-neutral-400">Chargement de votre Pass...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="bg-neutral-950 border border-neutral-800 p-8 rounded-2xl max-w-sm w-full">
          <p className="text-red-400 text-sm font-semibold mb-2">Billet introuvable</p>
          <p className="text-xs text-neutral-500">{error}</p>
        </div>
      </div>
    );
  }

  const holderFullName =
    ticket.holder_name ||
    `${ticket.holder_first_name || ''} ${ticket.holder_last_name || ''}`.trim() ||
    'Invité VIP';

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-6 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-md bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        
        <div className="text-center pb-5 border-b border-neutral-800">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full bg-amber-500/10">
            {ticket.ticket_type || 'Pass VIP Officiel'}
          </span>
          <h1 className="text-xl font-black uppercase tracking-tight text-white mt-3">
            La Nuit des Retrouvailles
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">Édition Spéciale — Parma</p>
        </div>

        <div className="py-4 border-b border-neutral-800/80 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-400 font-medium">Participant</span>
            <span className="font-bold text-white uppercase">{holderFullName}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-400 font-medium">Numéro Billet</span>
            <span className="font-mono text-amber-400 font-bold">{ticket.ticket_number}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-400 font-medium">Statut Entrée</span>
            <span className={`font-bold flex items-center gap-1 ${ticket.is_scanned ? 'text-emerald-400' : 'text-amber-400'}`}>
              <ShieldCheck className="w-3.5 h-3.5" /> {ticket.is_scanned ? 'Déjà Scanné' : 'Valide / Actif'}
            </span>
          </div>
        </div>

        <div className="my-5 flex flex-col items-center justify-center">
          <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-amber-500/30">
            {qrDataUrl && (
              <img src={qrDataUrl} alt="QR Code d'accès" className="w-56 h-56 rounded-lg object-contain" />
            )}
          </div>
          <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mt-3">
            Présentez ce QR Code à l'entrée
          </p>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3.5 space-y-2 text-xs text-neutral-300">
          <div className="flex items-center gap-2">
            <Wine className="w-4 h-4 text-amber-400 shrink-0" />
            <span>1 Consommation offerte incluse</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Parma, Italie</span>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="w-full mt-5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-bold py-3 rounded-xl uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition active:scale-95"
        >
          <Download className="w-4 h-4 text-amber-400" /> Télécharger / Imprimer le Pass
        </button>

      </div>
    </main>
  );
}

export default function TicketPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <TicketContent />
    </Suspense>
  );
}