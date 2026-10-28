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

export interface TenantInfo {
  id: string;
  name: string;
  subdomain: string;
}

interface AuthState {
  user: AuthUser | null;
  tenant: TenantInfo | null;
  currentSubdomain: string;
  token: string | null;
  refreshToken: string | null;
  isSuperAdmin: boolean;
  theme: 'light' | 'dark';
  locale: Locale;
  activeTab: 'chats' | 'tasks' | 'reports' | 'org_admin' | 'super_admin';

  setAuth: (user: AuthUser, tenant: TenantInfo, token: string, refreshToken: string) => void;
  setSuperAdminAuth: (token: string, admin: any) => void;
  setSubdomain: (subdomain: string) => void;
  setActiveTab: (tab: 'chats' | 'tasks' | 'reports' | 'org_admin' | 'super_admin') => void;
  toggleTheme: () => void;
  setLocale: (locale: Locale) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tenant: null,
      currentSubdomain: 'acme',
      token: null,
      refreshToken: null,
      isSuperAdmin: false,
      theme: 'light',
      locale: 'en',
      activeTab: 'chats',

      setAuth: (user, tenant, token, refreshToken) => {
        set({
          user,
          tenant,
          currentSubdomain: tenant.subdomain,
          token,
          refreshToken,
          isSuperAdmin: false,
        });
      },

      setSuperAdminAuth: (token, admin) => {
        set({
          user: { id: admin.id, email: admin.email, name: admin.name, role: 'SUPER_ADMIN' },
          tenant: null,
          token,
          isSuperAdmin: true,
          activeTab: 'super_admin',
        });
      },

      setSubdomain: (subdomain) => set({ currentSubdomain: subdomain }),
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
          tenant: null,
          token: null,
          refreshToken: null,
          isSuperAdmin: false,
        });
      },
    }),
    {
      name: 'auth_storage',
    },
  ),
);
