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
    ticket?: any;
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

  const verifyTicket = async (code: string) => {
    if (!code || loading || !isScanningActive) return;
    setLoading(true);
    setIsScanningActive(false);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), pin: '8520' }),
      });
      const data = await res.json();
      setScanResult(data);
    } catch (err) {
      setScanResult({ status: 'INVALID', message: 'Erreur de connexion au serveur' });
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
        console.warn('Erreur caméra:', err);
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [isAuthenticated, isScanningActive]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-sm w-full text-center space-y-4">
          <h1 className="text-xl font-bold tracking-wider uppercase text-amber-400">Contrôle d'Accès</h1>
          <p className="text-zinc-400 text-xs">Entrez le code PIN organisateur</p>
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
            className="text-xs bg-amber-500 text-black font-bold px-3 py-1.5 rounded-lg hover:bg-amber-400 transition"
          >
            Nouveau Scan
          </button>
        </div>

        {/* CADRE CAMÉRA */}
        <div className="relative rounded-3xl overflow-hidden border-2 border-dashed border-amber-500/50 bg-black min-h-[280px] flex items-center justify-center">
          <div id="reader" className="w-full"></div>
          {loading && (
            <div className="absolute inset-0 bg-black/85 flex items-center justify-center text-amber-400 font-bold z-10">
              Vérification...
            </div>
          )}
        </div>

        {/* AFFICHAGE DU RÉSULTAT */}
        {scanResult && (
          <div
            className={`p-6 rounded-2xl border text-center transition-all ${
              scanResult.status === 'ALREADY_USED'
                ? 'bg-red-950 border-red-500 text-red-100'
                : scanResult.status === 'VALID'
                ? 'bg-emerald-950 border-emerald-500 text-emerald-100'
                : 'bg-zinc-900 border-zinc-700 text-zinc-300'
            }`}
          >
            <h3 className="text-xl font-black">{scanResult.message}</h3>

            {scanResult.ticket && (
              <div className="mt-3 text-xs text-left bg-black/60 p-3.5 rounded-xl space-y-1.5 border border-zinc-800">
                <p><span className="text-zinc-500">Participant :</span> <strong>{scanResult.ticket.customer_name}</strong></p>
                <p><span className="text-zinc-500">Formule :</span> <strong className="text-amber-400">{scanResult.ticket.ticket_type}</strong></p>
                <p><span className="text-zinc-500">Code :</span> <strong className="font-mono text-zinc-200">{scanResult.ticket.ticket_code}</strong></p>
                <p>
                  <span className="text-zinc-500">Statut :</span>{' '}
                  <strong className={scanResult.status === 'ALREADY_USED' ? 'text-red-400 font-black' : 'text-emerald-400 font-black'}>
                    {scanResult.status === 'ALREADY_USED' ? 'DÉJÀ ENTRÉ' : 'VALIDE'}
                  </strong>
                </p>
              </div>
            )}

            <button
              onClick={handleNextScan}
              className="mt-4 w-full bg-white text-black font-bold py-2.5 rounded-xl text-sm hover:bg-zinc-200 transition"
            >
              Scanner le billet suivant
            </button>
          </div>
        )}

        {/* SAISIE MANUELLE */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl space-y-2">
          <label className="text-xs text-zinc-400">Ou saisie manuelle :</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="LNR-XXXXX-XXXX"
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