import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { formatDepartmentName } from '../services/dmsApi';
import {
  ChevronDown,
  User,
  LogOut,
  RefreshCw,
  Sun,
  Moon,
  ShieldCheck,
  Mail,
  Phone,
  Briefcase,
  IdCard,
} from 'lucide-react';

export const UserProfileMenu: React.FC = () => {
  const {
    currentUser,
    logout,
    refreshDmsData,
    isLoadingDms,
    isDmsConnected,
    isDark,
    toggleTheme,
    setActiveMobileTab,
  } = useAppStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      setIsOpen(false);
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleViewProfile = () => {
    setIsOpen(false);
    setActiveMobileTab('profile');
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Top Bar Trigger Button - Displays Authenticated User */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all text-xs font-medium text-slate-800 dark:text-slate-100 shadow-2xs hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {/* User Avatar Circle */}
          <div className="relative shrink-0">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-2xs ${currentUser.avatarBg}`}
            >
              {currentUser.avatar}
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"
              title="Online & Connected"
            />
          </div>

          {/* User Name & Department */}
          <div className="flex flex-col text-left min-w-0">
            <span className="font-bold text-slate-900 dark:text-slate-100 max-w-[130px] sm:max-w-[150px] truncate leading-tight">
              {currentUser.name}
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold truncate leading-none mt-0.5">
              {formatDepartmentName(currentUser.department)}
            </span>
          </div>

          {isDmsConnected && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-500 hidden sm:inline shrink-0"
              title="Connected to ERP-Task System"
            />
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ml-0.5 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Professional User Profile Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200/90 dark:border-slate-800 p-2 z-50 focus:outline-none animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-100 dark:divide-slate-800/80">
          {/* Header Card: Authenticated User Profile */}
          <div className="p-3 pb-3.5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow-md ${currentUser.avatarBg}`}
                >
                  {currentUser.avatar}
                </div>
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {currentUser.name}
                  </h3>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 shrink-0">
                    #{currentUser.id}
                  </span>
                </div>

                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate mt-0.5">
                  {currentUser.designation}
                </p>

                <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/50">
                  <Briefcase className="w-3 h-3 shrink-0" />
                  <span className="truncate">{formatDepartmentName(currentUser.department)}</span>
                </div>
              </div>
            </div>

            {/* Email & Contact Details */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2 truncate">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                  {currentUser.email || 'No email provided'}
                </span>
              </div>
              {currentUser.phone && (
                <div className="flex items-center gap-2 truncate">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                    {currentUser.phone}
                  </span>
                </div>
              )}
              {currentUser.managerName && (
                <div className="flex items-center gap-2 truncate text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  <IdCard className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Reports to: {currentUser.managerName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Menu Options */}
          <div className="py-1.5 space-y-0.5">
            <button
              type="button"
              onClick={handleViewProfile}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer text-left"
            >
              <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span>View Full Account Profile</span>
            </button>

            <button
              type="button"
              onClick={() => {
                refreshDmsData();
              }}
              disabled={isLoadingDms}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer text-left"
            >
              <span className="flex items-center gap-2.5">
                <RefreshCw className={`w-4 h-4 text-slate-400 ${isLoadingDms ? 'animate-spin text-emerald-600' : ''}`} />
                <span>Refresh</span>
              </span>
              {isLoadingDms && (
                <span className="text-[10px] text-emerald-600 font-semibold">Refreshing...</span>
              )}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer text-left"
            >
              <span className="flex items-center gap-2.5">
                {isDark ? (
                  <Sun className="w-4 h-4 text-amber-500" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-400" />
                )}
                <span>Theme Preference</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400 capitalize">
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </span>
            </button>
          </div>

          {/* Prominent & Clearly Visible Logout Section */}
          <div className="pt-1.5">
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:bg-rose-100 transition-colors cursor-pointer text-left disabled:opacity-50"
            >
              <LogOut className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out of Account'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
