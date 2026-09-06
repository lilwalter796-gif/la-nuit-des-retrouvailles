'use client';

import { useState } from 'react';

export default function AdminSendTicketModal({ ticketCode, defaultEmail, defaultName, defaultType, onClose }: {
  ticketCode: string;
  defaultEmail?: string;
  defaultName?: string;
  defaultType?: string;
  onClose?: () => void;
}) {
  const [toEmail, setToEmail] = useState(defaultEmail || '');
  const [customerName, setCustomerName] = useState(defaultName || '');
  const [ticketType, setTicketType] = useState(defaultType || 'ENTRÉE SIMPLE');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Appel vers la route /api/send-email (qui correspond à votre dossier send-email)
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toEmail,
          customerName,
          ticketCode,
          ticketType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'envoi de l'e-mail");
      }

      setMessage({ type: 'success', text: '✅ E-mail du billet envoyé avec succès !' });
      setTimeout(() => {
        if (onClose) onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Erreur:', err);
      setMessage({ type: 'error', text: `❌ ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl max-w-md w-full text-white shadow-xl">
      <h3 className="text-lg font-bold text-amber-400 mb-4">Envoyer le Billet par E-mail</h3>
      
      <form onSubmit={handleSendEmail} className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">E-mail du destinataire</label>
          <input
            type="email"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            required
            placeholder="client@example.com"
            className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-400 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Nom du participant</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
            placeholder="Nom et Prénom"
            className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-400 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Formule / Type</label>
          <input
            type="text"
            value={ticketType}
            onChange={(e) => setTicketType(e.target.value)}
            required
            className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-400 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Code du Billet</label>
          <input
            type="text"
            value={ticketCode}
            disabled
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-500 font-mono cursor-not-allowed"
          />
        </div>

        {message && (
          <p className={`text-xs p-2.5 rounded-lg ${message.type === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-red-950 text-red-300 border border-red-500/30'}`}>
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-3 rounded-xl transition text-xs uppercase tracking-wider disabled:opacity-50"
        >
          {loading ? 'Envoi en cours...' : 'Envoyer le Billet'}
        </button>
      </form>
    </div>
  );
}