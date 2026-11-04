import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { UserSwitcher } from './UserSwitcher';
import {
  MessageSquare,
  CheckSquare,
  Bell,
  Sun,
  Moon,
  PlusCircle,
  Smartphone,
  Monitor,
  Maximize2,
  RefreshCw,
} from 'lucide-react';

export const TopBar: React.FC = () => {
  const {
    activeMobileTab,
    setActiveMobileTab,
    isDark,
    toggleTheme,
    unreadNotificationCount,
    openCreateTaskModal,
    activeChatId,
    deviceView,
    setDeviceView,
    refreshDmsData,
    isLoadingDms,
    isDmsConnected,
  } = useAppStore();

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 select-none">
      {/* Zone 1: Brand */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white shadow-xs font-black text-xs tracking-tighter">
            DMS
          </div>
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap leading-tight">
              DMS Communication
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold tracking-wide uppercase leading-none">
              Tasking Module Integration
            </span>
          </div>
        </div>

        {/* Desktop Tabs */}
        <nav className="hidden lg:flex items-center gap-1 ml-4 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-lg">
          <button
            onClick={() => setActiveMobileTab('chats')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeMobileTab === 'chats'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chats</span>
          </button>
          <button
            onClick={() => setActiveMobileTab('tasks')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeMobileTab === 'tasks'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Tasks</span>
          </button>
          <button
            onClick={() => setActiveMobileTab('notifications')}
            className={`relative flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeMobileTab === 'notifications'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notifications</span>
            {unreadNotificationCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                {unreadNotificationCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Zone 2: Device Mode Switcher, DMS Sync & Persona */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Device Mode Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
          <button
            onClick={() => setDeviceView('mobile')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              deviceView === 'mobile'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Mobile phone layout"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mobile</span>
          </button>
          <button
            onClick={() => setDeviceView('desktop')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              deviceView === 'desktop'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Desktop split view"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            onClick={() => setDeviceView('responsive')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              deviceView === 'responsive'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Auto responsive viewport"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Auto</span>
          </button>
        </div>

        {/* Quick Task CTA */}
        <button
          onClick={() => openCreateTaskModal({ sourceChatId: activeChatId || undefined })}
          className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New DMS Task</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Toggle light / dark mode"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User Persona Switcher */}
        <UserSwitcher />
      </div>
    </header>
  );
};
