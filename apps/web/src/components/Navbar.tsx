'use client';
import React from 'react';
import { useAuthStore } from '../stores/auth.store';
import { translations } from '../i18n/translations';
import {
  MessageSquare,
  CheckSquare,
  BarChart3,
  Building2,
  Moon,
  Sun,
  Globe,
  LogOut,
  Users,
} from 'lucide-react';

interface NavbarProps {
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenLogin }) => {
  const {
    user,
    activeTab,
    setActiveTab,
    theme,
    toggleTheme,
    locale,
    setLocale,
    logout,
  } = useAuthStore();

  const t = translations[locale];

  return (
    <header className="h-14 bg-emerald-700 dark:bg-gray-900 text-white flex items-center justify-between px-4 border-b border-emerald-800 dark:border-gray-800 shadow-sm z-30">
      {/* Brand */}
      <div className="flex items-center space-x-3 rtl:space-x-reverse">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shadow-inner">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight hidden sm:inline">TaskCom</span>
            <span className="ml-2 rtl:mr-2 text-xs bg-emerald-800/80 dark:bg-gray-800 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-600/30">
              Workspace
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        {user && (
          <nav className="flex items-center space-x-1 rtl:space-x-reverse ml-4 rtl:mr-4">
            <button
              onClick={() => setActiveTab('chats')}
              className={`flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === 'chats'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-emerald-100 hover:bg-emerald-600/50'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.chats}</span>
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === 'tasks'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-emerald-100 hover:bg-emerald-600/50'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.tasks}</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === 'reports'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-emerald-100 hover:bg-emerald-600/50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.reports}</span>
            </button>

            {(user.role === 'OWNER' || user.role === 'ADMIN') && (
              <button
                onClick={() => setActiveTab('org_admin')}
                className={`flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  activeTab === 'org_admin'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-emerald-100 hover:bg-emerald-600/50'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.org_admin}</span>
              </button>
            )}
          </nav>
        )}
      </div>

      {/* Action Controls & User Switcher */}
      <div className="flex items-center space-x-2 rtl:space-x-reverse">
        {/* Quick Demo Switcher */}
        <button
          onClick={onOpenLogin}
          className="flex items-center space-x-1 rtl:space-x-reverse text-xs bg-emerald-800/90 hover:bg-emerald-800 px-2.5 py-1.5 rounded-md border border-emerald-600 text-emerald-100 shadow-sm"
        >
          <Users className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{t.switch_user}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? t.light_mode : t.dark_mode}
          className="p-1.5 rounded-full hover:bg-emerald-600 dark:hover:bg-gray-800 transition text-emerald-100"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Language Selector */}
        <button
          onClick={() => setLocale(locale === 'en' ? 'ur' : 'en')}
          title="Switch English / اردو"
          className="flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 rounded hover:bg-emerald-600 dark:hover:bg-gray-800 text-xs font-medium text-emerald-100 transition"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{locale === 'en' ? 'اردو' : 'EN'}</span>
        </button>

        {/* User Info & Logout */}
        {user ? (
          <div className="flex items-center space-x-2 rtl:space-x-reverse pl-2 rtl:pr-2 border-l rtl:border-r border-emerald-600/50 dark:border-gray-700">
            <div className="text-right rtl:text-left hidden sm:block">
              <div className="text-xs font-semibold leading-tight">{user.name}</div>
              <div className="text-[10px] text-emerald-200 dark:text-gray-400 capitalize">
                {user.role.toLowerCase()}
              </div>
            </div>
            <button
              onClick={logout}
              title={t.logout}
              className="p-1.5 rounded-full hover:bg-emerald-600 dark:hover:bg-gray-800 text-emerald-100 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="text-xs bg-white text-emerald-800 hover:bg-emerald-50 px-3 py-1.5 rounded-md font-semibold transition shadow-sm"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
