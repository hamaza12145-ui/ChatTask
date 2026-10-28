'use client';
import React, { useState } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { useSocketStore } from '../stores/socket.store';
import { useChatStore } from '../stores/chat.store';
import { useTaskStore } from '../stores/task.store';
import { api } from '../api/client';
import { X, Users, Shield, ArrowRight } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { setAuth, setSuperAdminAuth, setSubdomain } = useAuthStore();
  const { connect } = useSocketStore();
  const { fetchConversations } = useChatStore();
  const { fetchTasks } = useTaskStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [subdomain, setSubdomainInput] = useState('acme');
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const performLogin = async (targetEmail: string, targetPass: string, targetSubdomain: string, isSuper = false) => {
    setIsSubmitting(true);
    try {
      if (isSuper) {
        const res = await api.post<any>('/super-admin/login', {
          email: targetEmail,
          password: targetPass,
        });
        setSuperAdminAuth(res.access_token, res.admin);
      } else {
        setSubdomain(targetSubdomain);
        const res = await api.post<any>('/auth/login', {
          email: targetEmail,
          password: targetPass,
        });
        setAuth(res.user, res.tenant, res.access_token, res.refresh_token);
        connect();
        fetchConversations();
        fetchTasks();
      }
      onClose();
    } catch (err: any) {
      alert(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(email, password, subdomain, isSuperAdminMode);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-gray-200 dark:border-gray-800 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
              Demo Quick-Switch / Authentication
            </h3>
            <p className="text-[11px] text-gray-400">Select any seeded user or enter credentials</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Click Demo Profiles */}
        <div>
          <span className="font-bold text-[11px] uppercase tracking-wider text-gray-400 block mb-2">
            1-Click Pakistani Demo Accounts (TechPak - acme)
          </span>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            <button
              onClick={() => performLogin('tariq@acme.com', 'Password123!', 'acme')}
              disabled={isSubmitting}
              className="w-full p-2 bg-emerald-50 dark:bg-gray-800/80 hover:bg-emerald-100 dark:hover:bg-gray-700/80 rounded-lg border border-emerald-200 dark:border-gray-700 flex items-center justify-between text-left rtl:text-right transition"
            >
              <div>
                <div className="font-bold text-emerald-900 dark:text-emerald-300">Muhammad Tariq (CEO / Owner)</div>
                <div className="text-[10px] text-gray-500">tariq@acme.com â€¢ Administration</div>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-600" />
            </button>

            <button
              onClick={() => performLogin('fatima.zahra@acme.com', 'Password123!', 'acme')}
              disabled={isSubmitting}
              className="w-full p-2 bg-pink-50 dark:bg-gray-800/80 hover:bg-pink-100 dark:hover:bg-gray-700/80 rounded-lg border border-pink-200 dark:border-gray-700 flex items-center justify-between text-left rtl:text-right transition"
            >
              <div>
                <div className="font-bold text-pink-900 dark:text-pink-300">Fatima Zahra (HR Director)</div>
                <div className="text-[10px] text-gray-500">fatima.zahra@acme.com â€¢ HR Department</div>
              </div>
              <ArrowRight className="w-4 h-4 text-pink-600" />
            </button>

            <button
              onClick={() => performLogin('bilal.ahmed@acme.com', 'Password123!', 'acme')}
              disabled={isSubmitting}
              className="w-full p-2 bg-blue-50 dark:bg-gray-800/80 hover:bg-blue-100 dark:hover:bg-gray-700/80 rounded-lg border border-blue-200 dark:border-gray-700 flex items-center justify-between text-left rtl:text-right transition"
            >
              <div>
                <div className="font-bold text-blue-900 dark:text-blue-300">Bilal Ahmed (Chief Accountant)</div>
                <div className="text-[10px] text-gray-500">bilal.ahmed@acme.com â€¢ Accounts & Finance</div>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-600" />
            </button>

            <button
              onClick={() => performLogin('hamza.ali@acme.com', 'Password123!', 'acme')}
              disabled={isSubmitting}
              className="w-full p-2 bg-cyan-50 dark:bg-gray-800/80 hover:bg-cyan-100 dark:hover:bg-gray-700/80 rounded-lg border border-cyan-200 dark:border-gray-700 flex items-center justify-between text-left rtl:text-right transition"
            >
              <div>
                <div className="font-bold text-cyan-900 dark:text-cyan-300">Hamza Ali (IT & DevOps Lead)</div>
                <div className="text-[10px] text-gray-500">hamza.ali@acme.com â€¢ IT Department</div>
              </div>
              <ArrowRight className="w-4 h-4 text-cyan-600" />
            </button>

            <button
              onClick={() => performLogin('ayesha.khan@acme.com', 'Password123!', 'acme')}
              disabled={isSubmitting}
              className="w-full p-2 bg-amber-50 dark:bg-gray-800/80 hover:bg-amber-100 dark:hover:bg-gray-700/80 rounded-lg border border-amber-200 dark:border-gray-700 flex items-center justify-between text-left rtl:text-right transition"
            >
              <div>
                <div className="font-bold text-amber-900 dark:text-amber-300">Ayesha Khan (Marketing Director)</div>
                <div className="text-[10px] text-gray-500">ayesha.khan@acme.com â€¢ Marketing</div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-600" />
            </button>

            <button
              onClick={() => performLogin('kamran.akram@acme.com', 'Password123!', 'acme')}
              disabled={isSubmitting}
              className="w-full p-2 bg-orange-50 dark:bg-gray-800/80 hover:bg-orange-100 dark:hover:bg-gray-700/80 rounded-lg border border-orange-200 dark:border-gray-700 flex items-center justify-between text-left rtl:text-right transition"
            >
              <div>
                <div className="font-bold text-orange-900 dark:text-orange-300">Kamran Akram (Sales Manager)</div>
                <div className="text-[10px] text-gray-500">kamran.akram@acme.com â€¢ Sales & BD</div>
              </div>
              <ArrowRight className="w-4 h-4 text-orange-600" />
            </button>

            <button
              onClick={() => performLogin('superadmin@saas.com', 'SuperAdmin123!', '', true)}
              disabled={isSubmitting}
              className="w-full p-2 bg-purple-50 dark:bg-gray-800/80 hover:bg-purple-100 dark:hover:bg-gray-700/80 rounded-lg border border-purple-200 dark:border-gray-700 flex items-center justify-between text-left rtl:text-right transition"
            >
              <div>
                <div className="font-bold text-purple-900 dark:text-purple-300">Master Super Admin (Control Plane)</div>
                <div className="text-[10px] text-gray-500">superadmin@saas.com â€¢ Multi-Tenant Control</div>
              </div>
              <Shield className="w-4 h-4 text-purple-600" />
            </button>
          </div>
        </div>

        {/* Custom Credentials Form */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
          <span className="font-bold text-[11px] uppercase tracking-wider text-gray-400 block mb-2">
            Or Custom Login
          </span>
          <form onSubmit={handleCustomSubmit} className="space-y-2.5">
            <div>
              <input
                type="text"
                placeholder="Tenant Subdomain (e.g. acme)"
                value={subdomain}
                onChange={(e) => setSubdomainInput(e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border rounded-lg font-mono text-xs"
              />
            </div>
            <div>
              <input
                type="email"
                required
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border rounded-lg text-xs"
              />
            </div>
            <div>
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border rounded-lg text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm transition disabled:opacity-50"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
