import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { formatDepartmentName } from '../services/dmsApi';
import { ChevronDown, Check, UserCircle2, RefreshCw } from 'lucide-react';

export const UserSwitcher: React.FC = () => {
  const {
    currentUser,
    users,
    setCurrentUserId,
    addToast,
    refreshDmsData,
    isLoadingDms,
    isDmsConnected,
  } = useAppStore();

  const [isOpen, setIsOpen] = useState(false);
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

  const handleSelect = async (userId: string) => {
    setIsOpen(false);
    await setCurrentUserId(userId);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all text-xs font-medium text-slate-800 dark:text-slate-100 shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
      >
        <div className="flex items-center gap-1.5">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${currentUser.avatarBg}`}
          >
            {currentUser.avatar}
          </div>
          <span className="font-semibold text-slate-900 dark:text-slate-100 max-w-[120px] truncate">
            {currentUser.name}
          </span>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold hidden md:inline">
            ({formatDepartmentName(currentUser.department)})
          </span>
          {isDmsConnected && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 hidden sm:inline" title="Connected to DMS" />
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 focus:outline-none animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <UserCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>DMS USER PERSONA</span>
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                refreshDmsData();
              }}
              disabled={isLoadingDms}
              className="text-[10px] text-slate-400 hover:text-emerald-600 flex items-center gap-1 cursor-pointer"
              title="Resync users from DMS API"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingDms ? 'animate-spin text-emerald-600' : ''}`} />
              <span>Sync</span>
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto py-1 divide-y divide-slate-100/60 dark:divide-slate-800/60">
            {users.map((user) => {
              const isSelected = user.id === currentUser.id;
              return (
                <button
                  key={user.id}
                  onClick={() => handleSelect(user.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${user.avatarBg}`}
                      >
                        {user.avatar}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                          user.status === 'online'
                            ? 'bg-emerald-500'
                            : user.status === 'busy'
                            ? 'bg-rose-500'
                            : user.status === 'away'
                            ? 'bg-amber-500'
                            : 'bg-slate-400'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate leading-tight flex items-center gap-1">
                        <span>{user.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">#{user.id}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight">
                        {user.designation}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate">
                          {formatDepartmentName(user.department)}
                        </span>
                        {user.managerName && (
                          <span className="text-[9px] text-slate-400 truncate">
                            · Mgr: {user.managerName}
                          </span>
                        )}
                        {user.directReportIds && (
                          <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold truncate">
                            · Lead ({user.directReportIds.length})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
