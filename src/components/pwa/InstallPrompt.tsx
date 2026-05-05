"use client";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();

    const ios = /iphone|ipad|ipod/.test(userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsIOS(ios);
    setIsStandalone(standalone);

    const dismissedAt = localStorage.getItem("holy_install_dismissed_at");
    const alreadyShown = localStorage.getItem("holy_install_prompt_seen");

    const sevenDays = 1000 * 60 * 60 * 24 * 7;
    const canShowAgain =
      !dismissedAt || Date.now() - Number(dismissedAt) > sevenDays;

    if (!standalone && canShowAgain && !alreadyShown) {
      const timer = setTimeout(() => {
        setShow(true);
        localStorage.setItem("holy_install_prompt_seen", "true");
      }, 1800);

      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  async function handleInstall() {
    if (isIOS) {
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setShow(false);
    }

    setDeferredPrompt(null);
  }

  function handleClose() {
    localStorage.setItem("holy_install_dismissed_at", String(Date.now()));
    setShow(false);
  }

  if (!show || isStandalone) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/65 px-4 pb-5 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-fuchsia-400/25 bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.24),transparent_36%),linear-gradient(180deg,#160722,#07050b)] p-5 text-white shadow-[0_0_70px_rgba(217,70,239,0.24)]">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full bg-white/8 p-2 text-white/60 transition active:scale-95"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/15 shadow-[0_0_30px_rgba(217,70,239,0.32)]">
          <Smartphone className="h-7 w-7 text-fuchsia-200" />
        </div>

        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.28em] text-fuchsia-300">
          App oficial
        </p>

        <h2 className="text-2xl font-black leading-tight">
          Instalá HOLY en tu celular
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-white/65">
          Accedé rápido a tus QR, puntos, beneficios y HOLY Boxes desde la
          pantalla de inicio.
        </p>

        {isIOS ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/6 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
              <Share className="h-4 w-4 text-fuchsia-300" />
              En iPhone:
            </div>

            <ol className="space-y-2 text-sm text-white/70">
              <li>1. Tocá el botón de compartir de Safari.</li>
              <li>2. Elegí “Agregar a pantalla de inicio”.</li>
              <li>3. Tocá “Agregar”.</li>
            </ol>
          </div>
        ) : (
          <button
            onClick={handleInstall}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-300 px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-black shadow-[0_0_34px_rgba(217,70,239,0.30)] transition active:scale-[0.98]"
          >
            <Download className="h-4 w-4" />
            Instalar HOLY
          </button>
        )}

        <button
          onClick={handleClose}
          className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white/60 transition active:scale-[0.98]"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}