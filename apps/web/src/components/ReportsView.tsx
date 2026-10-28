'use client';
import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth.store';
import { translations } from '../i18n/translations';
import {
  BarChart3,
  Download,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  Users,
  Building,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { user, locale } = useAuthStore();
  const t = translations[locale];

  const [personal, setPersonal] = useState<any>(null);
  const [manager, setManager] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isManagerOrAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN' || user?.role === 'MANAGER';

  useEffect(() => {
    const load = async () => {
      try {
        const p = await api.get<any>('/reports/personal');
        setPersonal(p);

        if (isManagerOrAdmin) {
          const m = await api.get<any>('/reports/manager');
          setManager(m);
        }
      } catch (err) {
        console.error('Error fetching reports:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [isManagerOrAdmin]);

  const handleExportCsv = () => {
    window.open('http://localhost:4000/api/reports/export/csv', '_blank');
  };

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-gray-400">Loading metrics...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Title & Export */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-2 rtl:space-x-reverse">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span>Productivity & Task Metrics</span>
          </h2>
          <p className="text-xs text-gray-500">Live analytics for team coordination and performance</p>
        </div>
        <button
          onClick={handleExportCsv}
          className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg font-semibold transition shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span>{t.export_csv}</span>
        </button>
      </div>

      {/* Personal Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <Clock className="w-5 h-5" />
            <span className="text-[10px] uppercase font-bold text-gray-400">Due Today</span>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-gray-100">{personal?.due_today || 0}</div>
          <p className="text-[10px] text-gray-400 mt-1">Requires focus today</p>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between text-red-500 mb-1">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-[10px] uppercase font-bold text-gray-400">Overdue</span>
          </div>
          <div className="text-2xl font-black text-red-600">{personal?.overdue || 0}</div>
          <p className="text-[10px] text-gray-400 mt-1">Past deadline</p>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <CheckCircle className="w-5 h-5" />
            <span className="text-[10px] uppercase font-bold text-gray-400">Completed (7d)</span>
          </div>
          <div className="text-2xl font-black text-emerald-600">{personal?.completed_this_week || 0}</div>
          <p className="text-[10px] text-gray-400 mt-1">Achieved this week</p>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between text-purple-600 mb-1">
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px] uppercase font-bold text-gray-400">Total Active</span>
          </div>
          <div className="text-2xl font-black text-purple-600">{personal?.total_active || 0}</div>
          <p className="text-[10px] text-gray-400 mt-1">Assigned in progress</p>
        </div>
      </div>

      {/* Manager Department & User Overview */}
      {isManagerOrAdmin && manager && (
        <div className="space-y-6 pt-4">
          {/* User Metrics Table */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center space-x-2 rtl:space-x-reverse">
              <Users className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">Team Member Completion Rates</h3>
            </div>
            <table className="w-full text-left rtl:text-right text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">User</th>
                  <th className="py-2.5 px-4 font-semibold">Department</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Assigned</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Completed</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Overdue</th>
                  <th className="py-2.5 px-4 font-semibold text-center">On-Time %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {manager.users?.map((u: any) => (
                  <tr key={u.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="py-2.5 px-4 font-semibold text-gray-900 dark:text-gray-100">{u.name}</td>
                    <td className="py-2.5 px-4 text-gray-500">{u.department_name}</td>
                    <td className="py-2.5 px-4 text-center font-medium">{u.assigned}</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">{u.completed}</td>
                    <td className="py-2.5 px-4 text-center text-red-500 font-bold">{u.overdue}</td>
                    <td className="py-2.5 px-4 text-center font-bold">
                      <span className={`px-2 py-0.5 rounded ${u.on_time_percentage >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {u.on_time_percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
