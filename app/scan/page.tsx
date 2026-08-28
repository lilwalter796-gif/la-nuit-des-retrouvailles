"use client";

import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Lock, Camera, RotateCcw, Loader2 } from 'lucide-react';

export default function ScannerPage() {
  const [mounted, setMounted] = useState(false);
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [ticketInput, setTicketInput] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanning, setScanning] = useState(false);

  const scannerInstanceRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleUnlock = () => {
    if (pin.trim() === '8520') {
      setUnlocked(true);
    } else {
      alert('Code PIN incorrect (8520)');
    }
  };

  const handleValidateTicket = async (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode || loading) return;

    setLoading(true);

    // Mettre en pause le flux pendant la validation
    if (scannerInstanceRef.current && scannerInstanceRef.current.isScanning) {
      try {
        await scannerInstanceRef.current.pause(true);
      } catch (e) {}
    }

    try {
      const res = await fetch('/api/scan/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrToken: cleanCode,
          scannerPin: '8520',
          scannerName: 'Scanner Entrée',
        }),
      });

      const data = await res.json();
      setScanResult(data);
    } catch (err: any) {
      setScanResult({
        success: false,
        code: 'NETWORK_ERROR',
        message: 'Erreur de connexion au serveur.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Démarrage de la caméra une fois déverrouillé
  useEffect(() => {
    let qrCodeScanner: any = null;

    if (unlocked && mounted) {
      import('html5-qrcode').then(({ Html5Qrcode }) => {
        qrCodeScanner = new Html5Qrcode("interactive-scanner");
        scannerInstanceRef.current = qrCodeScanner;

        const config = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        qrCodeScanner.start(
          { facingMode: "environment" },
          config,
          (decodedText: string) => {
            // Détection automatique dès que le QR Code passe devant
            handleValidateTicket(decodedText);
          },
          () => {}
        ).then(() => {
          setScanning(true);
          setCameraError('');
        }).catch((err: any) => {
          console.error("Camera Start Error:", err);
          setCameraError("La caméra en direct nécessite HTTPS. Lancez le tunnel HTTPS (Étape 2) ou utilisez la saisie manuelle.");
          setScanning(false);
        });
      });
    }

    return () => {
      if (scannerInstanceRef.current) {
        try {
          if (scannerInstanceRef.current.isScanning) {
            scannerInstanceRef.current.stop().then(() => {
              scannerInstanceRef.current.clear();
            });
          }
        } catch (e) {}
      }
    };
  }, [unlocked, mounted]);

  const resumeScanning = async () => {
    setScanResult(null);
    setTicketInput('');
    if (scannerInstanceRef.current) {
      try {
        await scannerInstanceRef.current.resume();
      } catch (e) {}
    }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-black text-white p-4 font-sans flex flex-col items-center justify-start py-6">
      <div className="w-full max-w-sm">

        {!unlocked ? (
          /* ÉCRAN PIN */
          <div className="bg-neutral-950 border border-neutral-800 p-8 rounded-2xl text-center shadow-2xl mt-12">
            <div className="w-14 h-14 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
              <Lock className="w-7 h-7" />
            </div>
            
            <h1 className="text-lg font-black uppercase tracking-tight text-white">Contrôle Billetterie</h1>
            <p className="text-xs text-neutral-400 mt-1 mb-6">La Nuit des Retrouvailles — Parma</p>

            <div className="space-y-4">
              <input
                type="tel"
                inputMode="numeric"
                placeholder="Code PIN : 8520"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUnlock();
                }}
                className="w-full text-center text-2xl font-mono tracking-widest bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
              />

              <button
                type="button"
                onClick={handleUnlock}
                className="w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-black py-3.5 rounded-xl uppercase text-xs tracking-wider transition"
              >
                Activer le Scanner
              </button>
            </div>
          </div>
        ) : (
          /* SCANNER VIDÉO CONTINU */
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-widest flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Caméra en Direct
                </span>
                <h2 className="text-base font-black uppercase text-white">Contrôle Entrée</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUnlocked(false);
                  setPin('');
                  setScanResult(null);
                }}
                className="text-[10px] text-neutral-400 border border-neutral-800 px-3 py-1.5 rounded-lg active:bg-neutral-900"
              >
                Verrouiller
              </button>
            </div>

            {/* FENÊTRE CAMÉRA DIRECTE */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-neutral-800 bg-neutral-950 aspect-square shadow-2xl flex items-center justify-center">
              <div id="interactive-scanner" className="w-full h-full object-cover"></div>

              {cameraError && (
                <div className="absolute inset-0 bg-neutral-950/90 p-6 flex flex-col items-center justify-center text-center">
                  <Camera className="w-10 h-10 text-neutral-500 mb-2" />
                  <p className="text-xs text-neutral-300 font-medium">{cameraError}</p>
                </div>
              )}

              {loading && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center">
                  <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-2" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">Vérification du Billet...</span>
                </div>
              )}
            </div>

            {/* RÉSULTAT DU SCAN */}
            {scanResult && (
              <div
                className={`p-5 rounded-2xl text-center border transition-all ${
                  scanResult.success
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-100'
                    : scanResult.code === 'ALREADY_USED'
                    ? 'bg-amber-950 border-amber-500 text-amber-100'
                    : 'bg-red-950 border-red-500 text-red-100'
                }`}
              >
                {scanResult.success ? (
                  <>
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-1" />
                    <div className="text-xl font-black uppercase">ACCÈS VALIDÉ</div>
                    <div className="text-base font-bold uppercase mt-1">{scanResult.holder}</div>
                    <div className="text-xs font-mono opacity-80 mt-0.5">{scanResult.ticket_number}</div>
                    <div className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-3 py-1 rounded-full inline-block mt-2 uppercase">
                      Consommation Incluse
                    </div>
                  </>
                ) : scanResult.code === 'ALREADY_USED' ? (
                  <>
                    <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-1" />
                    <div className="text-xl font-black uppercase">DÉJÀ UTILISÉ</div>
                    <div className="text-sm font-bold uppercase mt-1">{scanResult.holder}</div>
                    <div className="text-xs opacity-80 mt-0.5">
                      Scanné à : {new Date(scanResult.scanned_at).toLocaleTimeString()}
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-12 h-12 text-red-400 mx-auto mb-1" />
                    <div className="text-xl font-black uppercase">BILLET INVALIDE</div>
                    <div className="text-xs opacity-80 mt-1">{scanResult.message}</div>
                  </>
                )}

                <button
                  type="button"
                  onClick={resumeScanning}
                  className="mt-3 bg-white text-black text-xs font-black uppercase px-5 py-2.5 rounded-xl flex items-center gap-1.5 mx-auto active:scale-95 shadow-lg"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reprendre le scan
                </button>
              </div>
            )}

            {/* SAISIE MANUELLE DE SECOURS */}
            <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-2xl">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ou taper: LNR-0326F5-IT"
                  value={ticketInput}
                  onChange={(e) => setTicketInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleValidateTicket(ticketInput);
                  }}
                  className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => handleValidateTicket(ticketInput)}
                  disabled={loading || !ticketInput.trim()}
                  className="bg-amber-500 text-black font-extrabold px-4 py-2.5 rounded-xl text-xs uppercase"
                >
                  Valider
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}