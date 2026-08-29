'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function TicketContent() {
  const searchParams = useSearchParams();
  const [ticket, setTicket] = useState<{
    customer_name: string;
    customer_email: string;
    ticket_type: string;
    ticket_code: string;
    amount_paid: number;
    status: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const EVENT_DETAILS = {
    title: 'La Nuit des Retrouvailles — Édition Prestige',
    description: "Votre pass d'accès officiel pour La Nuit des Retrouvailles. Présentez votre QR Code à l'entrée.",
    location: 'Parme, Italie',
    startDate: '20260829T210000Z',
    endDate: '20260830T050000Z',
  };

  useEffect(() => {
    const codeParam = searchParams.get('code');
    const sessionParam = searchParams.get('session_id');

    async function fetchTicket() {
      try {
        let url = '/api/tickets?';
        if (codeParam) url += `code=${encodeURIComponent(codeParam)}`;
        else if (sessionParam) url += `session_id=${encodeURIComponent(sessionParam)}`;
        else {
          setLoading(false);
          return;
        }

        const res = await fetch(url);
        const data = await res.json();
        if (data.ticket) {
          setTicket(data.ticket);
        }
      } catch (err) {
        console.error('Erreur chargement billet:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTicket();
  }, [searchParams]);

  const handleDownloadPDF = () => {
    window.print();
  };

  const handleAddToAppleCalendar = () => {
    const icsData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//La Nuit des Retrouvailles//FR',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `SUMMARY:${EVENT_DETAILS.title}`,
      `DESCRIPTION:${EVENT_DETAILS.description} Code billet: ${ticket?.ticket_code || ''}`,
      `LOCATION:${EVENT_DETAILS.location}`,
      `DTSTART:${EVENT_DETAILS.startDate}`,
      `DTEND:${EVENT_DETAILS.endDate}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT2H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Rappel : La Nuit des Retrouvailles commence dans 2 heures !',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'Billet-La-Nuit-Des-Retrouvailles.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddToGoogleCalendar = () => {
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      EVENT_DETAILS.title
    )}&dates=${EVENT_DETAILS.startDate}/${EVENT_DETAILS.endDate}&details=${encodeURIComponent(
      `${EVENT_DETAILS.description}\nCode Billet : ${ticket?.ticket_code || ''}`
    )}&location=${encodeURIComponent(EVENT_DETAILS.location)}`;
    window.open(googleCalendarUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-amber-400 flex items-center justify-center font-mono text-sm">
        Chargement de votre pass officiel...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-xl font-bold text-amber-400 mb-2">Aucun billet trouvé</h2>
        <p className="text-zinc-400 text-xs mb-6">Le lien du billet est invalide ou la commande est en cours de traitement.</p>
        <Link href="/" className="bg-amber-500 text-black font-bold px-6 py-2.5 rounded-xl text-xs hover:bg-amber-400 transition">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    ticket.ticket_code
  )}&margin=10`;

  return (
    <div className="min-h-screen bg-[#070707] text-white py-10 px-4 flex flex-col items-center justify-center print:bg-white print:p-0">
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card {
            border: 2px solid #000 !important;
            background: #fff !important;
            color: #000 !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .print-text-dark {
            color: #111 !important;
          }
          .print-border {
            border-color: #ddd !important;
          }
        }
      `}</style>

      {/* Navigation */}
      <div className="max-w-sm w-full mb-4 flex justify-between items-center no-print">
        <Link href="/" className="text-xs text-zinc-400 hover:text-amber-400 transition flex items-center gap-1">
          ← Retour à l'accueil
        </Link>
        <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
          Pass Confirmé
        </span>
      </div>

      {/* Carte Billet VIP */}
      <div className="print-card max-w-sm w-full bg-gradient-to-b from-zinc-900 to-black border border-amber-500/40 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(245,158,11,0.15)] relative">
        <div className="bg-zinc-950 p-6 text-center border-b border-zinc-800/80 print-border relative">
          <div className="text-[10px] font-mono tracking-widest text-amber-400 uppercase font-black mb-1">
            BILLET D'ACCÈS OFFICIEL
          </div>
          <h1 className="text-xl font-black tracking-tight text-white print-text-dark uppercase">
            La Nuit des Retrouvailles
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Samedi 29 Août 2026 • 21h00
          </p>
        </div>

        {/* QR Code Container */}
        <div className="p-6 flex flex-col items-center justify-center bg-black/40">
          <div className="bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center border-2 border-amber-400/50">
            <img
              src={qrCodeUrl}
              alt="QR Code Billet"
              width={180}
              height={180}
              className="rounded-lg"
            />
          </div>
          <div className="mt-4 text-center">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-mono block">Code Unique</span>
            <span className="text-base font-mono font-black text-amber-400 print-text-dark tracking-widest">
              {ticket.ticket_code}
            </span>
          </div>
        </div>

        {/* Ligne de découpe */}
        <div className="relative flex items-center justify-between px-2 no-print">
          <div className="w-5 h-5 bg-[#070707] rounded-full -ml-4 border-r border-amber-500/40"></div>
          <div className="flex-1 border-b border-dashed border-zinc-700 mx-2"></div>
          <div className="w-5 h-5 bg-[#070707] rounded-full -mr-4 border-l border-amber-500/40"></div>
        </div>

        {/* Détails */}
        <div className="p-6 bg-zinc-950/70 space-y-3 print-border">
          <div className="flex justify-between items-center text-xs pb-2 border-b border-zinc-800/60 print-border">
            <span className="text-zinc-400 print-text-dark">Titulaire</span>
            <strong className="text-white print-text-dark font-medium">{ticket.customer_name}</strong>
          </div>
          <div className="flex justify-between items-center text-xs pb-2 border-b border-zinc-800/60 print-border">
            <span className="text-zinc-400 print-text-dark">Formule</span>
            <strong className="text-amber-400 font-bold">{ticket.ticket_type}</strong>
          </div>
          <div className="flex justify-between items-center text-xs pb-2 border-b border-zinc-800/60 print-border">
            <span className="text-zinc-400 print-text-dark">Lieu de l'événement</span>
            <strong className="text-white print-text-dark">Parme, Italie</strong>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-400 print-text-dark">Statut du Pass</span>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-black uppercase">
              {ticket.status === 'USED' ? 'Déjà Scanné' : 'Valide'}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="max-w-sm w-full mt-6 space-y-3 no-print">
        <button
          onClick={handleDownloadPDF}
          className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)] transition text-sm uppercase tracking-wider"
        >
          <span>📥</span> Télécharger le Billet (PDF)
        </button>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleAddToAppleCalendar}
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-semibold py-3 px-2 rounded-2xl flex items-center justify-center gap-1.5 transition text-xs text-center"
          >
            <span>🍏</span> Apple Calendar (.ics)
          </button>

          <button
            onClick={handleAddToGoogleCalendar}
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-semibold py-3 px-2 rounded-2xl flex items-center justify-center gap-1.5 transition text-xs text-center"
          >
            <span>📅</span> Google Agenda
          </button>
        </div>

        <p className="text-[11px] text-zinc-500 text-center pt-2">
          💡 Enregistrez le PDF ou ajoutez le pass à votre calendrier pour recevoir un rappel avant le début de la soirée.
        </p>
      </div>
    </div>
  );
}

export default function TicketPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center font-mono text-sm">Chargement du billet...</div>}>
      <TicketContent />
    </Suspense>
  );
}