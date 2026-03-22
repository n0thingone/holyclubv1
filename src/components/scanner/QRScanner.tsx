"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, ScanLine, RotateCcw } from "lucide-react";

interface Props {
  onScan: (qr: string) => void;
  paused?: boolean;
}

export default function QRScanner({ onScan, paused = false }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(false);
  const isStartingRef = useRef(false);
  const isRunningRef = useRef(false);
  const lastScanRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef(0);

  const [scanning, setScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scannerReady, setScannerReady] = useState(false);

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      if (isRunningRef.current) {
        await scanner.stop();
      }
    } catch {}

    try {
      await scanner.clear();
    } catch {}

    scannerRef.current = null;
    isRunningRef.current = false;

    if (mountedRef.current) {
      setScanning(false);
    }
  };

  const handleDecoded = (decodedText: string) => {
    const clean = decodedText.trim();
    const now = Date.now();

    if (
      lastScanRef.current === clean &&
      now - lastScanTimeRef.current < 1800
    ) {
      return;
    }

    lastScanRef.current = clean;
    lastScanTimeRef.current = now;

    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(120);
      }
    } catch {}

    onScan(clean);
  };

  const startScanner = async () => {
    if (paused) return;
    if (isStartingRef.current || isRunningRef.current) return;

    isStartingRef.current = true;

    try {
      setErrorMsg(null);
      await stopScanner();

      const scannerId = "qr-reader";
      const scanner = new Html5Qrcode(scannerId);
      scannerRef.current = scanner;

      const qrSize =
        typeof window !== "undefined"
          ? Math.min(280, Math.floor(window.innerWidth * 0.72))
          : 250;

      try {
        await scanner.start(
          { facingMode: { ideal: "environment" } },
          {
            fps: 12,
            qrbox: { width: qrSize, height: qrSize },
            aspectRatio: 1,
          },
          handleDecoded,
          () => {}
        );
      } catch {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: qrSize, height: qrSize },
            aspectRatio: 1,
          },
          handleDecoded,
          () => {}
        );
      }

      isRunningRef.current = true;

      if (mountedRef.current) {
        setScanning(true);
      }
    } catch (err) {
      console.error("Error iniciando cámara", err);
      isRunningRef.current = false;

      if (mountedRef.current) {
        setScanning(false);
        setErrorMsg(
          "No se pudo abrir la cámara. Probá tocando de nuevo o revisá permisos del navegador."
        );
      }
    } finally {
      isStartingRef.current = false;
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      void stopScanner();
    };
  }, []);

  useEffect(() => {
    if (paused) {
      void stopScanner();
    }
  }, [paused]);

  return (
    <div className="w-full flex flex-col items-center justify-center gap-4">
      {!scannerReady && !scanning && (
        <button
          onClick={() => {
            setScannerReady(true);
            setTimeout(() => {
              void startScanner();
            }, 50);
          }}
          disabled={paused}
          className="group flex w-full max-w-[420px] items-center justify-center gap-3 rounded-2xl border border-fuchsia-400/20 bg-gradient-to-r from-fuchsia-600 to-violet-500 px-5 py-4 text-white shadow-[0_0_30px_rgba(217,70,239,0.25)] transition hover:scale-[1.01] disabled:opacity-50"
        >
          <Camera className="h-5 w-5" />
          <span className="text-sm font-bold tracking-[0.18em] uppercase">
            Iniciar scanner
          </span>
        </button>
      )}

      <div
        className={`${scannerReady ? "block" : "hidden"} w-full`}
        style={{
          maxWidth: "420px",
        }}
      >
        <div
          id="qr-reader"
          style={{
            width: "100%",
            maxWidth: "420px",
          }}
        />
      </div>

      <div className="text-sm text-white/70 text-center">
        {paused
          ? "Scanner pausado"
          : scanning
          ? "Cámara activa"
          : scannerReady
          ? "Iniciando cámara..."
          : "Tocá para activar la cámara"}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {scannerReady && !scanning && !paused && (
          <button
            onClick={() => void startScanner()}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 transition"
          >
            <RotateCcw className="h-4 w-4" />
            Reintentar cámara
          </button>
        )}

        {scanning && (
          <button
            onClick={() => {
              void stopScanner();
              setScannerReady(false);
            }}
            className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/15 transition"
          >
            <ScanLine className="h-4 w-4" />
            Detener scanner
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="text-xs text-red-400 text-center max-w-sm">
          {errorMsg}
        </div>
      )}
    </div>
  );
}