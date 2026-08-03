"use client";

import { useState, useEffect } from "react";

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem("prismz1_install_dismissed")) return;
    } catch {
      /* blocked */
    }
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    if (ios) {
      setTimeout(() => setShow(true), 2500);
      return;
    }

    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShow(true), 2500);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem("prismz1_install_dismissed", "1");
    } catch {
      /* blocked */
    }
    setShow(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    (deferredPrompt as any).prompt();
    const { outcome } = await (deferredPrompt as any).userChoice;
    if (outcome === "accepted") setShow(false);
    setDeferredPrompt(null);
  }

  if (!show) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50
      flex items-center gap-3 rounded-2xl border border-green-500/30
      bg-[#13151a]/95 backdrop-blur-md p-4 shadow-2xl shadow-black/60"
    >
      <div className="shrink-0 text-2xl select-none">🔋</div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-200">PrismZ1 Battery Calculator</p>
        <p className="text-[0.62rem] text-slate-400 mt-0.5 leading-tight">
          {isIOS
            ? 'Tap the share icon then "Add to Home Screen"'
            : "Add to your home screen for quick access"}
        </p>
      </div>

      {!isIOS && (
        <button
          onClick={install}
          className="shrink-0 px-3 py-1.5 rounded-lg border border-green-500/30
            bg-green-500/20 text-green-300 hover:bg-green-500/30
            text-[0.62rem] font-semibold transition-colors cursor-pointer"
        >
          Install
        </button>
      )}

      <button
        onClick={dismiss}
        className="shrink-0 text-slate-500 hover:text-slate-300 cursor-pointer text-lg leading-none"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
