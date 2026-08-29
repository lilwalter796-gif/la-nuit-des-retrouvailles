'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Link from 'next/link';

export default function ScanPage() {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [scanResult, setScanResult] = useState<{
    status: 'VALID' | 'ALREADY_USED' | 'INVALID';
    message: string;
    ticket?: {
      ticket_code?: string;
      customer_name?: string;
      customer_email?: string;
      ticket_type?: string;
      amount_paid?: number;
      status?: string;
      scanned_at?: string;
    };
    scannedAt?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isScanningActive, setIsScanningActive] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '8520') {
      setIsAuthenticated(true);
    } else {
      alert('Code PIN incorrect');
    }
  };

  const verifyTicket = async (codeToVerify: string) => {
    const clean = codeToVerify.replace(/\s+/g, '').toUpperCase();
    if (!clean || loading) return;
    setLoading(true);
    setIsScanningActive(false);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean, pin: '8520' }),
      });
      const data = await res.json();
      setScanResult(data);
    } catch (err) {
      setScanResult({ status: 'INVALID', message: 'Erreur de communication avec le serveur' });
    } finally {
      setLoading(false);
    }
  };

  const handleNextScan = () => {
    setScanResult(null);
    setManualCode('');
    setIsScanningActive(true);
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const html5QrCode = new Html5Qrcode('reader');
    scannerRef.current = html5QrCode;

    html5QrCode
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          verifyTicket(decodedText);
        },
        () => {}
      )
      .catch((err) => {
        console.warn('Accès caméra:', err);
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [isAuthenticated, isScanningActive]);

  const formatScanTime = (isoString?: string) => {
    if (!isoString) return new Date().toLocaleTimeString('fr-FR');
    try {
      return new Date(isoString).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl">
          <h1 className="text-xl font-bold tracking-wider uppercase text-amber-400">Contrôle d'Accès</h1>
          <p className="text-zinc-400 text-xs">Code PIN Organisateur Requis</p>
          <input
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            className="w-full text-center text-2xl tracking-widest bg-black border border-zinc-700 py-3 rounded-xl focus:border-amber-500 outline-none text-white font-mono"
            autoFocus
          />
          <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl transition">
            Déverrouiller
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 max-w-md mx-auto flex flex-col justify-between">
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
          <div>
            <h2 className="font-bold text-sm text-amber-400">SCANNER ENTRÉE</h2>
            <p className="text-xs text-zinc-400">La Nuit des Retrouvailles</p>
          </div>
          <button
            onClick={handleNextScan}
            className="text-xs bg-amber-500 text-black font-bold px-3.5 py-1.5 rounded-lg hover:bg-amber-400 transition"
          >
            Scanner Suivant
          </button>
        </div>

        {/* CADRE CAMÉRA */}
        <div className="relative rounded-3xl overflow-hidden border-2 border-dashed border-amber-500/50 bg-black min-h-[260px] flex items-center justify-center">
          <div id="reader" className="w-full"></div>
          {loading && (
            <div className="absolute inset-0 bg-black/85 flex items-center justify-center text-amber-400 font-bold z-10 text-sm">
              Vérification du pass en cours...
            </div>
          )}
        </div>

        {/* CARTE D'AFFICHAGE RÉSULTAT */}
        {scanResult && (
          <div
            className={`p-6 rounded-3xl border text-center transition-all ${
              scanResult.status === 'VALID'
                ? 'bg-emerald-950/95 border-emerald-500 text-white shadow-[0_0_35px_rgba(16,185,129,0.4)]'
                : scanResult.status === 'ALREADY_USED'
                ? 'bg-red-950 border-red-500 text-white shadow-[0_0_45px_rgba(239,68,68,0.7)] animate-pulse'
                : 'bg-zinc-900 border-zinc-700 text-zinc-300'
            }`}
          >
            <div
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-3 border ${
                scanResult.status === 'VALID'
                  ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400'
                  : scanResult.status === 'ALREADY_USED'
                  ? 'bg-red-600 text-white border-red-300'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-600'
              }`}
            >
              {scanResult.status === 'VALID' && '🟢 ENTRÉE AUTORISÉE'}
              {scanResult.status === 'ALREADY_USED' && '🚨 ENTRÉE REFUSÉE — BILLET DÉJÀ PRÉSENTÉ'}
              {scanResult.status === 'INVALID' && '⚠️ CODE REJETÉ'}
            </div>

            <h3 className="text-2xl font-black tracking-wide mb-1">{scanResult.message}</h3>

            <p className="text-xs text-zinc-300 mb-4 font-mono">
              {scanResult.status === 'ALREADY_USED'
                ? 'Premier scan enregistré à :'
                : 'Heure de validation :'} {' '}
              <span className="font-bold text-white bg-black/70 px-2.5 py-1 rounded-lg border border-white/20">
                {formatScanTime(scanResult.scannedAt || scanResult.ticket?.scanned_at)}
              </span>
            </p>

            {scanResult.ticket && (
              <div className="text-xs text-left bg-black/75 p-4 rounded-2xl space-y-2 border border-white/15 mb-4">
                <div className="flex justify-between border-b border-zinc-800 pb-1.5">
                  <span className="text-zinc-400">Participant</span>
                  <strong className="text-white text-sm">
                    {scanResult.ticket.customer_name || 'Invité Confirmé'}
                  </strong>
                </div>

                <div className="flex justify-between border-b border-zinc-800 pb-1.5">
                  <span className="text-zinc-400">Formule</span>
                  <strong className="text-amber-400 font-bold">
                    {scanResult.ticket.ticket_type || 'PASS OFFICIEL'}
                  </strong>
                </div>

                <div className="flex justify-between border-b border-zinc-800 pb-1.5">
                  <span className="text-zinc-400">Code Pass</span>
                  <strong className="font-mono text-zinc-100 tracking-wider">
                    {scanResult.ticket.ticket_code || manualCode}
                  </strong>
                </div>

                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-zinc-400">Statut du billet</span>
                  <span
                    className={`font-black uppercase px-2.5 py-1 rounded text-[11px] ${
                      scanResult.status === 'VALID'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-red-600 text-white border border-red-400'
                    }`}
                  >
                    {scanResult.status === 'ALREADY_USED' ? '⛔ DÉJÀ UTILISÉ' : '✅ VALIDE (1er scan)'}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleNextScan}
              className="w-full bg-white text-black font-bold py-3 rounded-xl text-sm hover:bg-zinc-200 transition shadow-lg"
            >
              Scanner le billet suivant
            </button>
          </div>
        )}

        {/* SAISIE MANUELLE */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl space-y-2">
          <label className="text-xs text-zinc-400">Saisie manuelle :</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="LNR-DFZ06-7994"
              className="flex-1 bg-black border border-zinc-700 px-3 py-2 rounded-xl text-sm font-mono uppercase text-white outline-none focus:border-amber-500"
            />
            <button
              onClick={() => verifyTicket(manualCode)}
              className="bg-amber-500 text-black font-bold px-4 py-2 rounded-xl text-sm hover:bg-amber-400 transition"
            >
              Valider
            </button>
          </div>
        </div>
      </div>

      <div className="pt-6">
        <Link href="/" className="block text-center text-zinc-500 text-xs py-2 hover:text-zinc-300">
          ← Revenir au site principal
        </Link>
      </div>
    </div>
  );
}