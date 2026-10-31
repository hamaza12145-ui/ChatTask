import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  User,
  Shield,
  Briefcase,
  Mail,
  Sun,
  Moon,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const {
    currentUser,
    users,
    setCurrentUserId,
    isDark,
    toggleTheme,
    tasks,
    addToast,
  } = useAppStore();

  const myTasks = tasks.filter((t) => t.assigneeIds.includes(currentUser.id));
  const completedTasks = myTasks.filter((t) => t.status === 'completed');
  const inProgressTasks = myTasks.filter((t) => t.status === 'in_progress');
  const reviewTasks = tasks.filter((t) => t.creatorId === currentUser.id && t.status === 'under_review');

  const handleSwitchUser = (userId: string) => {
    setCurrentUserId(userId);
    const u = users.find((x) => x.id === userId);
    if (u) {
      addToast(`Switched user to ${u.name}`, 'info');
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
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" title="Online" />
              </div>

              <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
                {currentUser.designation}
              </p>

              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  {currentUser.department} Department
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {currentUser.email}
                </span>
              </div>
            </div>
          </div>

          {/* Quick User Stats */}
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

      {/* Main Content Area */}
      <div className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-6">
        {/* Appearance Settings */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              Interface Theme
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Toggle between crisp daylight mode and dark slate theme
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        </div>

        {/* User Switcher Quick Gallery */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Switch Testing Persona</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Test both task creator and assignee perspectives in real-time
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            {users.map((user) => {
              const isActive = user.id === currentUser.id;
              return (
                <button
                  key={user.id}
                  onClick={() => handleSwitchUser(user.id)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl text-left border transition-all ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-700 ring-2 ring-indigo-500/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 ${user.avatarBg}`}
                  >
                    {user.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {user.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {user.designation} · {user.department}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
