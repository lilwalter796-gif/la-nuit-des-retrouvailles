"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Sparkles, ArrowLeft, Loader2, Download, Printer } from 'lucide-react';
import QRCodeSVG from 'qrcode';

function TicketViewer() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [qrCodes, setQrCodes] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadTickets() {
      if (!sessionId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/orders/by-session?session_id=${sessionId}`);
        const data = await res.json();
        
        if (data.tickets && data.tickets.length > 0) {
          setTickets(data.tickets);
          const generated: { [key: string]: string } = {};
          for (const t of data.tickets) {
            generated[t.id] = await QRCodeSVG.toDataURL(t.qr_token, {
              width: 260,
              margin: 1,
              color: { dark: '#000000', light: '#ffffff' }
            });
          }
          setQrCodes(generated);
        } else {
          setError(data.error || 'Aucun billet trouvé.');
        }
      } catch (e: any) {
        setError('Erreur lors du chargement de vos billets.');
      } finally {
        setLoading(false);
      }
    }
    loadTickets();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-4" />
        <p className="text-xs uppercase tracking-widest text-neutral-400 font-bold">
          Génération de votre billet officiel...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 text-center">
        <p className="text-sm text-red-400 mb-4">{error}</p>
        <a href="/" className="text-xs text-amber-400 underline uppercase">Retour à l'accueil</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-10 px-4 font-sans selection:bg-amber-500 selection:text-black">
      <div className="max-w-md mx-auto">
        
        {/* Header Confirmation */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-500/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <span className="text-[10px] uppercase tracking-widest text-amber-500 font-bold">Paiement Confirmé</span>
          <h1 className="text-2xl font-black uppercase tracking-tight mt-1">Vos Billets Officiels</h1>
          <p className="text-xs text-neutral-400 mt-1">
            À présenter sur smartphone à l'entrée de la soirée.
          </p>
        </div>

        {/* Cartes Billets */}
        <div className="space-y-6">
          {tickets.map((t, idx) => (
            <div 
              key={t.id} 
              className="bg-neutral-950 border border-amber-500/50 rounded-2xl p-6 relative overflow-hidden shadow-2xl shadow-amber-500/10"
            >
              <div className="flex justify-between items-start border-b border-neutral-800 pb-3 mb-4">
                <div>
                  <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-bold uppercase tracking-widest">
                    <Sparkles className="w-3 h-3" />
                    Billet #{idx + 1} • Prévente
                  </div>
                  <h2 className="text-base font-black uppercase text-white mt-0.5">LA NUIT DES RETROUVAILLES</h2>
                  <p className="text-[11px] text-neutral-400">Samedi 17 Octobre 2026 • 20h00</p>
                </div>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-black px-2 py-1 rounded">
                  20 € CONSO
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div>
                  <span className="text-neutral-500 text-[9px] uppercase block">Titulaire</span>
                  <span className="font-extrabold uppercase text-white text-xs">{t.holder_first_name} {t.holder_last_name}</span>
                </div>
                <div>
                  <span className="text-neutral-500 text-[9px] uppercase block">N° Billet</span>
                  <span className="font-mono font-bold text-amber-400 text-xs">{t.ticket_number}</span>
                </div>
              </div>

              {/* QR Code Imprimé */}
              <div className="bg-white p-3 rounded-xl flex flex-col items-center justify-center max-w-[200px] mx-auto my-3 shadow-inner">
                {qrCodes[t.id] && (
                  <img src={qrCodes[t.id]} alt="QR Code Ticket" className="w-44 h-44" />
                )}
                <span className="text-[8px] font-mono text-black font-semibold mt-1">{t.ticket_number}</span>
              </div>

              <div className="text-center text-[10px] text-neutral-400 italic">
                Via Adolfo Consolini 3, Parma • 1 Conso Incluse
              </div>
            </div>
          ))}
        </div>

        {/* Boutons d'action */}
        <div className="mt-8 flex flex-col gap-3 text-center">
          <button
            onClick={() => window.print()}
            className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider border border-neutral-700 transition flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            Imprimer / Enregistrer en PDF
          </button>
          
          <a
            href="/"
            className="inline-flex items-center justify-center gap-1.5 text-xs text-neutral-400 hover:text-white uppercase tracking-wider pt-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour au site
          </a>
        </div>

      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Chargement...</div>}>
      <TicketViewer />
    </Suspense>
  );
}