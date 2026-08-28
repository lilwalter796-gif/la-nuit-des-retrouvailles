'use client';

import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import Link from 'next/link';

export default function ScanPage() {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '8520') {
      setIsAuthenticated(true);
    } else {
      alert('Code PIN incorrect');
    }
  };

  const handleScan = async (detectedCodes: any[]) => {
    if (!detectedCodes || detectedCodes.length === 0 || loading) return;
    const rawValue = detectedCodes[0]?.rawValue;
    if (rawValue) {
      await verifyTicket(rawValue);
    }
  };

  const verifyTicket = async (code: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, pin: '8520' }),
      });
      const data = await res.json();
      setScanResult(data);
    } catch (err) {
      setScanResult({ success: false, message: 'Erreur réseau lors de la vérification' });
    } finally {
      setLoading(false);
    }
  };

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
          <button onClick={() => setScanResult(null)} className="text-xs bg-zinc-800 px-3 py-1.5 rounded-lg text-zinc-300">
            Nouveau Scan
          </button>
        </div>

        {/* CADRE SCANNER CAMÉRA */}
        <div className="relative rounded-3xl overflow-hidden border-2 border-dashed border-amber-500/50 bg-black aspect-square">
          <Scanner
            onScan={handleScan}
            formats={['qr_code']}
            styles={{ container: { width: '100%', height: '100%' } }}
          />
          {loading && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-amber-400 font-bold">
              Vérification en cours...
            </div>
          )}
        </div>

        {/* RÉSULTAT DU SCAN */}
        {scanResult && (
          <div className={`p-5 rounded-2xl border text-center ${
            scanResult.success
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
              : scanResult.alreadyUsed
              ? 'bg-amber-950/80 border-amber-500 text-amber-200'
              : 'bg-red-950/80 border-red-500 text-red-200'
          }`}>
            <h3 className="text-lg font-black">{scanResult.message}</h3>
            {scanResult.ticket && (
              <div className="mt-3 text-xs text-left bg-black/50 p-3 rounded-xl space-y-1">
                <p><strong>Nom :</strong> {scanResult.ticket.customer_name}</p>
                <p><strong>Formule :</strong> {scanResult.ticket.ticket_type}</p>
                <p><strong>Code :</strong> {scanResult.ticket.ticket_code}</p>
              </div>
            )}
          </div>
        )}

        {/* SAISIE MANUELLE */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl space-y-2">
          <label className="text-xs text-zinc-400">Saisie manuelle du code :</label>
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
        <Link href="/" className="block text-center text-zinc-500 text-xs py-2">
          ← Revenir au site principal
        </Link>
      </div>
    </div>
  );
}