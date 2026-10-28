'use client';

import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaRegister: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registered with scope:', reg.scope);
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err);
          });
      });
    }

    // 2. Check if already running in installed standalone mode
    if (typeof window !== 'undefined') {
      const isRunningStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isRunningStandalone);
    }

    // 3. Capture native install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      console.log('[PWA] User accepted install prompt');
      setInstallPrompt(null);
    }
  };

  // Don't render banner if running as installed standalone app or dismissed
  if (isStandalone || isDismissed || !installPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-emerald-700 text-white p-3.5 rounded-xl shadow-xl flex items-center justify-between animate-fade-in border border-emerald-500/30">
      <div className="flex items-center space-x-3 rtl:space-x-reverse">
        <div className="w-10 h-10 rounded-lg bg-emerald-800 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-sm">Install TaskCom App</p>
          <p className="text-xs text-emerald-100">Add to home screen for faster access & alerts</p>
        </div>
      </div>
      <div className="flex items-center space-x-2 rtl:space-x-reverse shrink-0">
        <button
          onClick={handleInstallClick}
          className="bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-sm"
        >
          Install
        </button>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 hover:bg-emerald-600 rounded-lg transition text-emerald-200 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
