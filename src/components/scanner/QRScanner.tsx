"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScan: (token: string) => void;
  active?: boolean;
}

export function QRScanner({ onScan, active = true }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const containerId = "qr-reader";

  useEffect(() => {
    if (!active) return;

    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          onScan(decodedText);
        },
        undefined
      )
      .then(() => setStarted(true))
      .catch((err) => {
        setError("No se pudo acceder a la cámara. Verificar permisos.");
        console.error(err);
      });

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [active]);

  return (
    <div className="relative w-full aspect-square max-w-xs mx-auto rounded-2xl overflow-hidden bg-black">
      {/* Camera feed */}
      <div id={containerId} className="w-full h-full" />

      {/* Overlay corners */}
      {started && (
        <div className="scanner-overlay pointer-events-none">
          <div className="scanner-corner scanner-corner-tl" />
          <div className="scanner-corner scanner-corner-tr" />
          <div className="scanner-corner scanner-corner-bl" />
          <div className="scanner-corner scanner-corner-br" />
          {/* Scan line */}
          <div className="absolute left-2 right-2 h-0.5 bg-accent-purple/70 scan-line shadow-purple-sm" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background p-4">
          <div className="text-center">
            <p className="text-danger text-sm mb-2">⚠️ {error}</p>
            <p className="text-text-muted text-xs">
              Permitir acceso a la cámara e intentar de nuevo
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
