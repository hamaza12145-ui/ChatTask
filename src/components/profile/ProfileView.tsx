import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { formatDepartmentName } from '../../services/dmsApi';
import {
  User,
  Shield,
  Briefcase,
  Mail,
  Phone,
  Sun,
  Moon,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  IdCard,
  LogOut,
  RefreshCw,
  Building2,
  Key,
  ShieldAlert,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const {
    currentUser,
    logout,
    refreshDmsData,
    isLoadingDms,
    isDark,
    toggleTheme,
    tasks,
    addToast,
    isDmsConnected,
  } = useAppStore();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const myTasks = tasks.filter((t) => t.assigneeIds.includes(currentUser.id));
  const completedTasks = myTasks.filter((t) => t.status === 'completed');
  const inProgressTasks = myTasks.filter((t) => t.status === 'in_progress');
  const reviewTasks = tasks.filter((t) => t.creatorId === currentUser.id && t.status === 'under_review');

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/60 dark:bg-slate-950 overflow-y-auto">
      {/* Top Banner & Profile Info */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md shrink-0 ${currentUser.avatarBg}`}
            >
              {currentUser.avatar}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
                  {currentUser.name}
                </h2>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" title="Active Online" />
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  ERP #{currentUser.id}
                </span>
              </div>

              <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
                {currentUser.designation}
              </p>

              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                  <Briefcase className="w-3.5 h-3.5" />
                  {formatDepartmentName(currentUser.department)} Department
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {currentUser.email}
                </span>
                {currentUser.phone && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {currentUser.phone}
                    </span>
                  </>
                )}
                {currentUser.managerName && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                      Reports to: {currentUser.managerName}
                    </span>
                  </>
                )}
                {currentUser.directReportIds && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                      {currentUser.directReportIds.length} Direct Reports
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick User Stats from DMS Tasks */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Assigned Tasks</span>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-0.5">
                {myTasks.length}
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 text-center">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Completed</span>
              <p className="text-lg font-bold text-emerald-900 dark:text-emerald-300 font-mono tabular-nums mt-0.5">
                {completedTasks.length}
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 text-center">
              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Pending Review</span>
              <p className="text-lg font-bold text-amber-900 dark:text-amber-300 font-mono tabular-nums mt-0.5">
                {reviewTasks.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Account Details & Session Management */}
      <div className="max-w-2xl mx-auto w-full p-6 space-y-6">
        {/* Account Information Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IdCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Authenticated Account Information
              </h3>
            </div>
            <button
              onClick={() => refreshDmsData()}
              disabled={isLoadingDms}
              className="text-xs text-slate-400 hover:text-emerald-600 flex items-center gap-1 cursor-pointer font-medium"
              title="Refresh profile from ERP API"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDms ? 'animate-spin text-emerald-600' : ''}`} />
              <span>{isLoadingDms ? 'Refreshing...' : 'Refresh Profile'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Full Name</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{currentUser.name}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Official Email</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{currentUser.email || 'None'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Designation / Role</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{currentUser.designation}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Department</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">{formatDepartmentName(currentUser.department)}</span>
            </div>
          </div>
        </div>

        {/* DMS Core Integration Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                ERP-Task Core Integration Status
              </h3>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected &amp; Active
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Single Source of Truth</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">ERP-Task REST APIs</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Database Storage</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">task_db (PostgreSQL)</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Active Tasks In Scope</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{tasks.length} tasks</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Authentication Mode</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">JWT Bearer Session</span>
            </div>
          </div>
        </div>

        {/* Clear & Visible Logout Section */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-900/50 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <LogOut className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Account Session Management
            </h3>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            Sign out to securely close your active session on this device. You will be redirected to the sign-in screen.
          </p>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 dark:bg-rose-600 dark:hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out of Account'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
