"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

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

  useEffect(() => {
    mountedRef.current = true;
    const scannerId = "qr-reader";

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

      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(120);
      }

      onScan(clean);
    };

    const startScanner = async () => {
      if (paused) {
        await stopScanner();
        return;
      }

      if (isStartingRef.current || isRunningRef.current) return;

      isStartingRef.current = true;

      try {
        setErrorMsg(null);
        await stopScanner();

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
            "No se pudo abrir la cámara. Revisá permisos del navegador."
          );
        }
      } finally {
        isStartingRef.current = false;
      }
    };

    void startScanner();

    return () => {
      mountedRef.current = false;
      void stopScanner();
    };
  }, [paused, onScan]);

  return (
    <div className="w-full flex flex-col items-center justify-center gap-3">
      <div
        id="qr-reader"
        style={{
          width: "100%",
          maxWidth: "420px",
        }}
      />

      <div className="text-sm text-white/70 text-center">
        {paused
          ? "Scanner pausado"
          : scanning
          ? "Cámara activa"
          : "Iniciando cámara..."}
      </div>

      {errorMsg && (
        <div className="text-xs text-red-400 text-center max-w-sm">
          {errorMsg}
        </div>
      )}
    </div>
  );
}