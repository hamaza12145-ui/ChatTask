import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Wifi, Battery, Signal, Smartphone, Monitor, Maximize2 } from 'lucide-react';

interface MobileDeviceFrameProps {
  children: React.ReactNode;
}

export const MobileDeviceFrame: React.FC<MobileDeviceFrameProps> = ({ children }) => {
  const { deviceView, setDeviceView, isDark } = useAppStore();

  // If responsive and on a desktop screen, user can still see the mobile frame if deviceView === 'mobile'
  const isMobileFramed = deviceView === 'mobile';

  if (!isMobileFramed) {
    return <>{children}</>;
  }

  // Current time for phone status bar
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex-1 w-full h-full bg-slate-200/80 dark:bg-slate-950 flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4 select-none">
      {/* Top Controller Bar */}
      <div className="w-full max-w-md mb-2 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-800 backdrop-blur-md flex items-center justify-between shadow-xs text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
          <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Mobile Touch Simulator (WhatsApp-style)</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDeviceView('desktop')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-[11px]"
            title="Switch to full desktop split view"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            onClick={() => setDeviceView('responsive')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-[11px]"
            title="Switch to fluid responsive view"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fluid</span>
          </button>
        </div>
      </div>

      {/* Realistic Mobile Device Frame Chassis */}
      <div className="relative my-auto w-full max-w-[400px] h-[810px] max-h-[calc(100vh-80px)] rounded-[46px] border-[10px] border-slate-900 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col bg-white dark:bg-slate-900 ring-1 ring-black/10">
        {/* Hardware details: Volume buttons & power button */}
        <div className="absolute -left-[13px] top-24 w-[3px] h-10 bg-slate-700 rounded-l-sm" />
        <div className="absolute -left-[13px] top-38 w-[3px] h-10 bg-slate-700 rounded-l-sm" />
        <div className="absolute -right-[13px] top-28 w-[3px] h-14 bg-slate-700 rounded-r-sm" />

        {/* Phone Status Bar with Dynamic Island */}
        <div className="h-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-6 flex items-center justify-between text-xs text-slate-900 dark:text-slate-100 z-30 shrink-0 font-medium">
          {/* Time */}
          <span className="font-semibold text-[13px] tracking-tight">{currentTime}</span>

          {/* Dynamic Island Notch */}
          <div className="w-24 h-5 rounded-full bg-black flex items-center justify-end px-2 -mt-1 shadow-inner">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 ring-1 ring-slate-800 mr-1" />
          </div>

          {/* Icons: 5G, Wi-Fi, Battery */}
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] font-bold">100%</span>
              <Battery className="w-4 h-4 fill-current text-slate-900 dark:text-slate-100" />
            </div>
          </div>
        </div>

        {/* Screen Viewport Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {children}
        </div>

        {/* Phone Bottom Home Indicator */}
        <div className="h-4 bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 z-30">
          <div className="w-32 h-1 bg-slate-400 dark:bg-slate-600 rounded-full" />
        </div>
      </div>
    </div>
  );
};
