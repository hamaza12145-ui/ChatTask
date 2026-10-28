import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Locale } from '../i18n/translations';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url?: string | null;
  department_id?: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
  designation?: {
    id: string;
    title: string;
  } | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  theme: 'light' | 'dark';
  locale: Locale;
  activeTab: 'chats' | 'tasks' | 'reports' | 'org_admin';

  setAuth: (user: AuthUser, token: string, refreshToken: string) => void;
  setActiveTab: (tab: 'chats' | 'tasks' | 'reports' | 'org_admin') => void;
  toggleTheme: () => void;
  setLocale: (locale: Locale) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      theme: 'light',
      locale: 'en',
      activeTab: 'chats',

      setAuth: (user: AuthUser, token: string, refreshToken: string) => {
        set({
          user,
          token,
          refreshToken,
        });
      },

      setActiveTab: (activeTab) => set({ activeTab }),

      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        if (typeof document !== 'undefined') {
          if (next === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
        set({ theme: next });
      },

      setLocale: (locale) => {
        if (typeof document !== 'undefined') {
          document.documentElement.dir = locale === 'ur' ? 'rtl' : 'ltr';
          document.documentElement.lang = locale;
        }
        set({ locale });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
        });
      },
    }),
    {
      name: 'auth_storage',
    },
  ),
);
