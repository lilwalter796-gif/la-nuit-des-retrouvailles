"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  QrCode, 
  Music, 
  CheckCircle2, 
  Phone, 
  ChevronRight,
  Loader2,
  AlertCircle
} from "lucide-react";

export default function Home() {
  const [ticketCount, setTicketCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  });

  // Compte à rebours jusqu'au 17 octobre 2026 à 20:00 (Europe/Rome)
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const targetDate = new Date("2026-10-17T20:00:00+02:00").getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Déclenchement du paiement Stripe Checkout
  const handleStripePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: ticketCount,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url; // Redirection vers Stripe
      } else {
        setErrorMessage(data.error || "Une erreur est survenue lors de l'initialisation.");
        setLoading(false);
      }
    } catch (err) {
      setErrorMessage("Impossible de contacter le serveur de paiement. Veuillez réessayer.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-amber-500 selection:text-black">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs tracking-widest text-amber-500 font-bold border border-amber-500/40 px-2 py-0.5 rounded">S.L GROUP</span>
            <span className="font-extrabold tracking-tight text-sm uppercase hidden sm:inline">La Nuit des Retrouvailles</span>
          </div>

          <div className="flex items-center gap-4">
            <a href="#artistes" className="text-xs uppercase tracking-wider text-neutral-400 hover:text-white transition">Artistes</a>
            <a href="#billets" className="text-xs uppercase tracking-wider text-neutral-400 hover:text-white transition">Billetterie</a>
            <a 
              href="#billets"
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold px-4 py-1.5 rounded-full text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition transform active:scale-95"
            >
              Prévente 20 €
            </a>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 px-4 overflow-hidden border-b border-neutral-900 flex flex-col items-center justify-center min-h-[90vh]">
        {/* Halos d'ambiance */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-red-600/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-500/15 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Badge S.L GROUP */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900/80 border border-neutral-800 text-amber-400 text-xs font-semibold uppercase tracking-widest mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          S.L Group Présente
        </div>

        {/* Titre Principal */}
        <h1 className="text-4xl sm:text-6xl md:text-8xl font-black text-center tracking-tighter uppercase leading-none">
          <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-200 to-neutral-500">
            La Nuit Des
          </span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-600 italic font-serif">
            Retrouvailles
          </span>
        </h1>

        <div className="flex items-center gap-2 mt-3 mb-6">
          <span className="text-xs uppercase tracking-widest text-neutral-400">Tournée</span>
          <span className="px-2 py-0.5 rounded text-xs font-black tracking-widest bg-gradient-to-r from-emerald-600 via-white to-red-600 text-black">
            ITALIE
          </span>
        </div>

        {/* Accroche officielle */}
        <p className="text-xs md:text-sm uppercase tracking-widest font-semibold text-neutral-300 text-center max-w-lg mb-8">
          Deux artistes, une scène, un show exceptionnel.
        </p>

        {/* Têtes d'affiche */}
        <div id="artistes" className="grid grid-cols-2 gap-4 w-full max-w-2xl my-4">
          <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800/80 text-center relative overflow-hidden group hover:border-amber-500/50 transition">
            <div className="text-amber-400 text-[10px] tracking-widest uppercase font-bold mb-1">Tête d'affiche</div>
            <h2 className="text-xl md:text-3xl font-black tracking-tight uppercase">KRATOS</h2>
            <div className="text-xs text-neutral-400 italic">Le Dieu de la guerre</div>
          </div>

          <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800/80 text-center relative overflow-hidden group hover:border-amber-500/50 transition">
            <div className="text-amber-400 text-[10px] tracking-widest uppercase font-bold mb-1">Tête d'affiche</div>
            <h2 className="text-xl md:text-3xl font-black tracking-tight uppercase">HAPPY D'EFOULAN</h2>
            <div className="text-xs text-neutral-400 italic">En Showcase Exclusif</div>
          </div>
        </div>

        {/* Infos Pratiques */}
        <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8 my-6 text-xs md:text-sm font-semibold text-neutral-300">
          <div className="flex items-center gap-1.5 bg-neutral-900/60 px-3 py-1.5 rounded-lg border border-neutral-800">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Samedi 17 Octobre 2026</span>
          </div>
          <div className="flex items-center gap-1.5 bg-neutral-900/60 px-3 py-1.5 rounded-lg border border-neutral-800">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>À partir de 20h</span>
          </div>
          <div className="flex items-center gap-1.5 bg-neutral-900/60 px-3 py-1.5 rounded-lg border border-neutral-800">
            <MapPin className="w-4 h-4 text-amber-400" />
            <span>Via Adolfo Consolini 3, Parma</span>
          </div>
        </div>

        {/* CTA Hero */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md mt-4">
          <a
            href="#billets"
            className="w-full text-center bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black py-4 px-6 rounded-xl text-base uppercase tracking-wider shadow-xl shadow-amber-500/20 transition transform active:scale-95"
          >
            Acheter mon billet — 20 €
          </a>
          <a
            href="#tables"
            className="w-full text-center bg-neutral-900/80 hover:bg-neutral-800 text-white font-bold py-4 px-6 rounded-xl text-sm uppercase tracking-wider border border-neutral-700 transition"
          >
            Réserver une table
          </a>
        </div>
        <p className="text-[11px] text-neutral-400 mt-2">
          Prévente en ligne : <strong className="text-amber-400">20 € avec conso</strong> (au lieu de 25 € sur place).
        </p>

        {/* Compteur */}
        <div className="grid grid-cols-4 gap-2 text-center max-w-sm w-full mt-10 p-3 bg-neutral-950/80 rounded-xl border border-neutral-800/80">
          <div>
            <div className="text-xl md:text-2xl font-black text-amber-400">{timeLeft.days}</div>
            <div className="text-[9px] uppercase tracking-wider text-neutral-400">Jours</div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-amber-400">{timeLeft.hours}</div>
            <div className="text-[9px] uppercase tracking-wider text-neutral-400">Heures</div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-amber-400">{timeLeft.minutes}</div>
            <div className="text-[9px] uppercase tracking-wider text-neutral-400">Min</div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-amber-400">{timeLeft.seconds}</div>
            <div className="text-[9px] uppercase tracking-wider text-neutral-400">Sec</div>
          </div>
        </div>
      </section>

      {/* SECTION LINE-UP DJS */}
      <section className="py-12 bg-neutral-950/60 border-b border-neutral-900 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-[11px] uppercase tracking-widest text-neutral-400 font-bold">Aux Platines</span>
          <h2 className="text-2xl md:text-3xl font-black uppercase mt-1 mb-6 text-neutral-200">Line-up DJs d'exception</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["DJ Senateur", "DJ Armel", "DJ New Star", "DJ Samy"].map((dj, index) => (
              <div key={index} className="p-3 bg-neutral-900/60 rounded-lg border border-neutral-800 flex items-center justify-center gap-2">
                <Music className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs uppercase font-extrabold tracking-wider">{dj}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION BILLETTERIE (PAIEMENT STRIPE DIRECT) */}
      <section id="billets" className="py-16 md:py-24 px-4 bg-black border-b border-neutral-900">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <span className="text-xs uppercase tracking-widest text-amber-500 font-bold">Billetterie Officielle</span>
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight mt-1">Votre Billet</h2>
            <p className="text-xs text-neutral-400 mt-2">Accès prioritaire + 1 Consommation incluse</p>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 md:p-8 shadow-2xl relative">
            <div className="flex items-center justify-between pb-6 border-b border-neutral-800 mb-6">
              <div>
                <div className="inline-block bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase mb-1">
                  Avantage Prévente
                </div>
                <h3 className="text-lg font-black uppercase">Entrée Simple + Conso</h3>
                <div className="text-xs text-neutral-400">Accès 1 personne • 17.10.2026 à Parma</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-amber-400">20 €</div>
                <div className="text-[11px] text-neutral-500 line-through">25 € sur place</div>
              </div>
            </div>

            {/* Sélecteur de Quantité */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs uppercase tracking-wider font-semibold text-neutral-300">Nombre de billets</span>
              <div className="flex items-center gap-3 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                  className="w-8 h-8 flex items-center justify-center font-bold bg-neutral-800 rounded-lg hover:bg-neutral-700 transition"
                >
                  -
                </button>
                <span className="font-bold text-sm w-4 text-center">{ticketCount}</span>
                <button
                  type="button"
                  onClick={() => setTicketCount(ticketCount + 1)}
                  className="w-8 h-8 flex items-center justify-center font-bold bg-neutral-800 rounded-lg hover:bg-neutral-700 transition"
                >
                  +
                </button>
              </div>
            </div>

            {/* Message d'erreur éventuel */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-950/50 border border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Formulaire acheteur */}
            <form onSubmit={handleStripePayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Prénom</label>
                  <input
                    type="text"
                    required
                    placeholder="Jean"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Nom</label>
                  <input
                    type="text"
                    required
                    placeholder="Dupont"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">E-mail (pour recevoir le billet)</label>
                <input
                  type="email"
                  required
                  placeholder="jean.dupont@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Téléphone</label>
                <input
                  type="tel"
                  required
                  placeholder="+39 351 157 9156"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 text-black font-black py-4 px-6 rounded-xl text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Redirection vers le paiement...</span>
                    </>
                  ) : (
                    <>
                      <span>Valider & Payer {ticketCount * 20} €</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Badges réassurance */}
            <div className="grid grid-cols-3 gap-2 mt-6 pt-6 border-t border-neutral-900 text-center text-[10px] text-neutral-400">
              <div className="flex flex-col items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span>Paiement 100% sécurisé</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <QrCode className="w-4 h-4 text-amber-500" />
                <span>QR Code instantané</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-amber-500" />
                <span>Conso incluse</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION RÉSERVATION TABLES VIP */}
      <section id="tables" className="py-16 px-4 bg-neutral-950/40 border-b border-neutral-900 text-center">
        <div className="max-w-2xl mx-auto">
          <span className="text-xs uppercase tracking-widest text-amber-500 font-bold">Espace VIP</span>
          <h2 className="text-3xl font-black uppercase tracking-tight mt-1 mb-3">Réservez Votre Table</h2>
          <p className="text-xs text-neutral-400 mb-6 max-w-md mx-auto">
            Les formules et tarifs pour les tables VIP seront communiqués très prochainement. Contactez directement l'organisation pour pré-réserver.
          </p>
          <a
            href="https://wa.me/393511579156?text=Bonjour,%20je%20souhaite%20réserver%20une%20table%20pour%20La%20Nuit%20des%20Retrouvailles"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-600/20"
          >
            <Phone className="w-4 h-4" />
            Contacter par WhatsApp (+39 351 157 9156)
          </a>
        </div>
      </section>

      {/* SECTION LOCALISATION */}
      <section className="py-16 px-4 bg-black border-b border-neutral-900 text-center">
        <div className="max-w-xl mx-auto">
          <span className="text-xs uppercase tracking-widest text-neutral-400 font-bold">Lieu de l'Événement</span>
          <h2 className="text-2xl font-black uppercase tracking-tight mt-1 mb-2">Comment Venir ?</h2>
          <p className="text-sm font-semibold text-amber-400 mb-4">
            Via Adolfo Consolini 3, 43221 Parma, Italie
          </p>
          <a
            href="https://maps.google.com/?q=Via+Adolfo+Consolini+3,+Parma,+Italie"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 py-3 px-6 rounded-xl text-xs uppercase tracking-wider transition"
          >
            <MapPin className="w-4 h-4 text-amber-400" />
            Ouvrir dans Google Maps
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-4 bg-neutral-950 text-neutral-500 text-xs text-center">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="text-amber-500 font-extrabold uppercase tracking-widest">S.L GROUP</div>
          <div className="text-white font-bold">LA NUIT DES RETROUVAILLES — 17 OCTOBRE 2026</div>
          <div className="text-neutral-400">Infoline : +39 351 157 9156 / +39 327 967 5879</div>
          <div className="pt-4 border-t border-neutral-900 text-[10px] text-neutral-600">
            © 2026 S.L GROUP. Tous droits réservés.
          </div>
        </div>
      </footer>

      {/* STICKY BOTTOM BAR SMARTPHONE */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-black/95 backdrop-blur-lg border-t border-neutral-800 z-40 flex gap-2">
        <a
          href="#billets"
          className="flex-1 bg-gradient-to-r from-amber-400 to-amber-500 text-black text-center font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-amber-500/20"
        >
          Billet — 20 €
        </a>
        <a
          href="#tables"
          className="bg-neutral-900 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider border border-neutral-700"
        >
          Tables
        </a>
      </div>

    </div>
  );
}