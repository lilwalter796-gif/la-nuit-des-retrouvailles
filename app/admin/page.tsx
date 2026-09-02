"use client";

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  QrCode, 
  DollarSign, 
  UserPlus, 
  Search, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  ShieldCheck, 
  X, 
  Wine, 
  MapPin, 
  Download,
  Eye
} from 'lucide-react';
import QRCode from 'qrcode';

export default function AdminDashboard() {
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false); // Pour le refresh silencieux
  const [stats, setStats] = useState<any>({ totalSold: 0, scannedCount: 0, scannedRate: 0, totalRevenue: '0.00' });
  const [tickets, setTickets] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  // Formulaire VIP
  const [vipName, setVipName] = useState('');
  const [vipEmail, setVipEmail] = useState('');
  const [vipType, setVipType] = useState('VIP_INVITE');
  const [creatingVip, setCreatingVip] = useState(false);

  // Popup Modal Billet Direct
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [modalQrUrl, setModalQrUrl] = useState<string>('');

  // Fonction de récupération modifiée pour accepter un mode "silencieux" (sans bloquer l'UI)
  const fetchData = async (secretPin: string, silent = false) => {
    if (!silent) setLoading(true);
    if (silent) setIsRefreshing(true);
    
    try {
      const res = await fetch(`/api/admin?pin=${secretPin}`);
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats);
        setTickets(data.tickets || []);
        setUnlocked(true);
      } else {
        if (!silent) alert(data.error || 'Code PIN incorrect');
      }
    } catch (e) {
      if (!silent) alert('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // 🔴 NOUVEAU : Auto-refresh toutes les 5 secondes quand le dashboard est déverrouillé
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (unlocked && pin) {
      interval = setInterval(() => {
        fetchData(pin, true); // Appelle la base de données en mode "silencieux"
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [unlocked, pin]);

  const openTicketModal = async (ticket: any) => {
    setSelectedTicket(ticket);
    const codeToEncode = ticket.qr_token || ticket.ticket_number || ticket.ticket_code;
    try {
      const qrData = await QRCode.toDataURL(codeToEncode, {
        width: 320,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setModalQrUrl(qrData);
    } catch (err) {
      console.error('Erreur génération QR:', err);
    }
  };

  const handleCreateVip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vipName || !vipEmail) return;

    setCreatingVip(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: '8520',
          holder_name: vipName,
          holder_email: vipEmail,
          ticket_type: vipType,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setVipName('');
        setVipEmail('');
        await fetchData('8520');
        if (data.ticket) {
          openTicketModal(data.ticket);
        }
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert('Erreur lors de la création');
    } finally {
      setCreatingVip(false);
    }
  };

  const filteredTickets = tickets.filter((t) => 
    t.holder_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.holder_email?.toLowerCase().includes(search.toLowerCase()) ||
    t.ticket_number?.toLowerCase().includes(search.toLowerCase()) ||
    t.ticket_code?.toLowerCase().includes(search.toLowerCase())
  );

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 font-sans">
        <div className="bg-neutral-950 border border-neutral-800 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
          <div className="w-14 h-14 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-black uppercase tracking-tight text-white">Administration Centrale</h1>
          <p className="text-xs text-neutral-400 mt-1 mb-6">La Nuit des Retrouvailles — Parma</p>

          <form onSubmit={(e) => { e.preventDefault(); fetchData(pin); }} className="space-y-4">
            <input
              type="password"
              placeholder="Code PIN Admin (8520)"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full text-center text-xl font-mono tracking-widest bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={loading || !pin}
              className="w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-black font-black py-3.5 rounded-xl uppercase text-xs tracking-wider transition"
            >
              {loading ? 'Connexion...' : 'Accéder au Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans max-w-6xl mx-auto relative">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-neutral-800">
        <div>
          <span className="text-xs uppercase font-bold text-amber-400 tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Mode Live {isRefreshing && <span className="text-neutral-500 ml-2 animate-pulse text-[10px]">(Syncing...)</span>}
          </span>
          <h1 className="text-2xl font-black uppercase text-white tracking-tight">Tableau de Bord — Événement</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchData('8520', false)}
            disabled={loading}
            className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || isRefreshing ? 'animate-spin' : ''}`} /> Actualiser
          </button>
          <button
            onClick={() => setUnlocked(false)}
            className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 text-xs font-bold px-4 py-2.5 rounded-xl transition"
          >
            Verrouiller
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <div className="bg-neutral-950 border border-neutral-800 p-5 rounded-2xl transition-all">
          <div className="flex justify-between items-center text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase">Total Inscrits</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{stats.totalSold}</div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800 p-5 rounded-2xl transition-all">
          <div className="flex justify-between items-center text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase">Entrées Validées</span>
            <QrCode className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">
            {stats.scannedCount} <span className="text-sm font-semibold text-neutral-500">({stats.scannedRate}%)</span>
          </div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800 p-5 rounded-2xl transition-all">
          <div className="flex justify-between items-center text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase">En Attente</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{stats.totalSold - stats.scannedCount}</div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800 p-5 rounded-2xl transition-all">
          <div className="flex justify-between items-center text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase">Recettes Stripe</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400">{stats.totalRevenue} €</div>
        </div>
      </div>

      {/* GRILLE PRINCIPALE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CRÉER INVITATION VIP */}
        <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-2xl h-fit">
          <h2 className="text-sm font-black uppercase text-amber-400 flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4" /> Émettre une Invitation VIP
          </h2>
          <form onSubmit={handleCreateVip} className="space-y-3">
            <div>
              <label className="text-[11px] uppercase font-bold text-neutral-400 block mb-1">Nom & Prénom :</label>
              <input
                type="text"
                required
                placeholder="Ex: Paul Pogba"
                value={vipName}
                onChange={(e) => setVipName(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase font-bold text-neutral-400 block mb-1">Adresse Email :</label>
              <input
                type="email"
                required
                placeholder="invitation@email.com"
                value={vipEmail}
                onChange={(e) => setVipEmail(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase font-bold text-neutral-400 block mb-1">Catégorie :</label>
              <select
                value={vipType}
                onChange={(e) => setVipType(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="VIP_INVITE">Invitation VIP (Gratuit)</option>
                <option value="STAFF">Staff / Organisation</option>
                <option value="ARTISTE">Artiste / Guest</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={creatingVip}
              className="w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-black font-black py-3 rounded-xl uppercase text-xs tracking-wider transition mt-2"
            >
              {creatingVip ? 'Génération...' : 'Créer & Ouvrir le Pass'}
            </button>
          </form>
        </div>

        {/* LISTE DES BILLETS */}
        <div className="lg:col-span-2 bg-neutral-950 border border-neutral-800 p-6 rounded-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="text-sm font-black uppercase text-white">Liste des Participants ({filteredTickets.length})</h2>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-500" />
              <input
                type="text"
                placeholder="Rechercher nom, billet..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-500 uppercase text-[10px]">
                  <th className="py-2.5 font-bold">Participant</th>
                  <th className="py-2.5 font-bold">Billet</th>
                  <th className="py-2.5 font-bold">Type</th>
                  <th className="py-2.5 font-bold">Statut Entrée</th>
                  <th className="py-2.5 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id || ticket.ticket_code} className="hover:bg-neutral-900/40">
                    <td className="py-3 pr-2">
                      <div className="font-bold text-white uppercase">{ticket.holder_name || ticket.customer_name}</div>
                      <div className="text-[10px] text-neutral-500">{ticket.holder_email || ticket.customer_email}</div>
                    </td>
                    <td className="py-3 font-mono text-[11px] text-neutral-300">
                      {ticket.ticket_number || ticket.ticket_code}
                    </td>
                    <td className="py-3">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-neutral-700 bg-neutral-900 text-neutral-300 uppercase">
                        {ticket.ticket_type || 'Standard'}
                      </span>
                    </td>
                    <td className="py-3">
                      {ticket.is_scanned || ticket.status === 'SCANNED' ? (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Scanné
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Non scanné
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openTicketModal(ticket)}
                        className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-amber-500/10"
                      >
                        <Eye className="w-3.5 h-3.5" /> Voir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* POPUP MODALE : PASS ET QR CODE DIRECTS */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-6 max-w-sm w-full relative shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            
            <button
              type="button"
              onClick={() => setSelectedTicket(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1.5 rounded-full bg-neutral-800/80 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center pb-4 border-b border-neutral-800">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full bg-amber-500/10">
                {selectedTicket.ticket_type || 'Pass VIP Officiel'}
              </span>
              <h3 className="text-lg font-black uppercase text-white mt-2">La Nuit des Retrouvailles</h3>
              <p className="text-[11px] text-neutral-400">Édition Spéciale — Parma</p>
            </div>

            <div className="py-3 border-b border-neutral-800/80 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-neutral-400">Participant :</span>
                <span className="font-bold text-white uppercase">{selectedTicket.holder_name || selectedTicket.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Numéro Billet :</span>
                <span className="font-mono text-amber-400 font-bold">{selectedTicket.ticket_number || selectedTicket.ticket_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Statut Entrée :</span>
                <span className={`font-bold flex items-center gap-1 ${(selectedTicket.is_scanned || selectedTicket.status === 'SCANNED') ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {(selectedTicket.is_scanned || selectedTicket.status === 'SCANNED') ? 'Déjà Scanné' : 'Valide / Prêt'}
                </span>
              </div>
            </div>

            {/* QR CODE GRAND FORMAT */}
            <div className="my-4 flex flex-col items-center">
              <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-amber-500/30">
                {modalQrUrl && (
                  <img src={modalQrUrl} alt="QR Code d'accès" className="w-48 h-48 rounded-lg object-contain" />
                )}
              </div>
              <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mt-2.5">
                Prêt pour le scan caméra
              </p>
            </div>

            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-2.5 mb-4 text-[11px] text-neutral-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Wine className="w-3.5 h-3.5 text-amber-400" /> 1 Boisson incluse</span>
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-amber-400" /> Parma</span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-bold py-2.5 rounded-xl uppercase text-[11px] tracking-wider flex items-center justify-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" /> Imprimer
              </button>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black py-2.5 rounded-xl uppercase text-[11px] tracking-wider transition"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}