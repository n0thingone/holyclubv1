"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/browser";
import { Camera, RotateCcw, ScanLine } from "lucide-react";

interface Props {
  onScan: (qr: string) => void;
  paused?: boolean;
}

export default function QRScanner({ onScan, paused = false }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const mountedRef = useRef(false);
  const isStartingRef = useRef(false);
  const isRunningRef = useRef(false);
  const lastScanRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef(0);

  const [scannerReady, setScannerReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stopScanner = async () => {
    try {
      controlsRef.current?.stop();
    } catch {}

    controlsRef.current = null;

    try {
      readerRef.current?.reset();
    } catch {}

    readerRef.current = null;
    isRunningRef.current = false;

    const video = videoRef.current;
    if (video?.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }

    if (mountedRef.current) {
      setScanning(false);
    }
  };

  const handleDecoded = (text: string) => {
    const clean = text.trim();
    const now = Date.now();

    if (!clean) return;

    if (
      lastScanRef.current === clean &&
      now - lastScanTimeRef.current < 1800
    ) {
      return;
    }

    lastScanRef.current = clean;
    lastScanTimeRef.current = now;

    try {
      if ("vibrate" in navigator) navigator.vibrate(120);
    } catch {}

    onScan(clean);
  };

  const startScanner = async () => {
    if (paused) return;
    if (!videoRef.current) return;
    if (isStartingRef.current || isRunningRef.current) return;

    isStartingRef.current = true;
    setErrorMsg(null);

    try {
      await stopScanner();

      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      let deviceId: string | undefined;

      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();

        if (devices.length > 0) {
          const backCam =
            devices.find((d) =>
              /back|rear|environment|trasera/i.test(d.label)
            ) || devices[devices.length - 1];

          deviceId = backCam.deviceId;
        }
      } catch {}

      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            handleDecoded(result.getText());
            return;
          }

          if (error && !(error instanceof NotFoundException)) {
            console.error("ZXing scan error:", error);
          }
        }
      );

      controlsRef.current = controls;
      isRunningRef.current = true;

      if (mountedRef.current) {
        setScanning(true);
      }
    } catch (err) {
      console.error("Error iniciando cámara:", err);
      isRunningRef.current = false;

      if (mountedRef.current) {
        setScanning(false);
        setErrorMsg(
          "No se pudo abrir la cámara. Probá desde Safari o usá el token manual."
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
            }, 100);
          }}
          disabled={paused}
          className="flex w-full max-w-[420px] items-center justify-center gap-3 rounded-2xl border border-fuchsia-400/20 bg-gradient-to-r from-fuchsia-600 to-violet-500 px-5 py-4 text-white shadow-[0_0_30px_rgba(217,70,239,0.25)] transition hover:scale-[1.01] disabled:opacity-50"
        >
          <Camera className="h-5 w-5" />
          <span className="text-sm font-bold tracking-[0.18em] uppercase">
            Iniciar scanner
          </span>
        </button>
      )}

      <div
        className={`${scannerReady ? "block" : "hidden"} w-full`}
        style={{ maxWidth: "420px" }}
      >
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          <video
            ref={videoRef}
            className="h-[320px] w-full object-cover"
            muted
            playsInline
            autoPlay
          />
        </div>
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