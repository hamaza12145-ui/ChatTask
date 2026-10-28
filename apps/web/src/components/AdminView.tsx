'use client';
import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth.store';
import { translations } from '../i18n/translations';
import {
  Building2,
  Users,
  UserPlus,
  Shield,
  HardDrive,
  Copy,
  Check,
  AlertOctagon,
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const { user, locale, tenant } = useAuthStore();
  const t = translations[locale];

  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [u, d, b] = await Promise.all([
        api.get<any[]>('/org/users'),
        api.get<any[]>('/org/departments'),
        api.get<any[]>('/org/branches'),
      ]);
      setUsers(u);
      setDepartments(d);
      setBranches(b);
    } catch (err) {
      console.error('Error loading admin data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;

    setIsSubmitting(true);
    try {
      const res = await api.post<{ inviteLink: string }>('/auth/invite', {
        email: inviteEmail,
        name: inviteName,
        role: inviteRole,
      });
      setGeneratedInviteLink(res.inviteLink);
      setInviteEmail('');
      setInviteName('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Invitation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user? They will lose access immediately.')) return;
    try {
      await api.patch(`/org/users/${userId}/deactivate`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Deactivation failed');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedInviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-2 rtl:space-x-reverse">
          <Building2 className="w-5 h-5 text-emerald-600" />
          <span>Organization Administration</span>
        </h2>
        <p className="text-xs text-gray-500">Manage team members, roles, departments, and storage</p>
      </div>

      {/* Storage Quota Card */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">{t.storage_usage}</h4>
            <p className="text-xs text-gray-500">Plan: Enterprise (500 GB Storage Quota)</p>
          </div>
        </div>
        <div className="w-48 text-right rtl:text-left">
          <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden mb-1">
            <div className="bg-emerald-500 h-full w-[4%]" />
          </div>
          <span className="text-[10px] text-gray-400">12.4 MB / 500 GB (0.01% used)</span>
        </div>
      </div>

      {/* Invite Member Card */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
        <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center space-x-2 rtl:space-x-reverse">
          <UserPlus className="w-4 h-4 text-emerald-600" />
          <span>{t.invite_user}</span>
        </h3>
        <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <input
            type="text"
            required
            placeholder="Full Name"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none"
          />
          <input
            type="email"
            required
            placeholder="Email Address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none"
          >
            <option value="MEMBER">Member</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition disabled:opacity-50 py-2"
          >
            Generate Link
          </button>
        </form>

        {generatedInviteLink && (
          <div className="p-3 bg-emerald-50 dark:bg-gray-800 border border-emerald-200 dark:border-gray-700 rounded-lg flex items-center justify-between text-xs mt-2">
            <span className="text-emerald-800 dark:text-emerald-300 truncate max-w-lg font-mono">
              {generatedInviteLink}
            </span>
            <button
              onClick={handleCopyLink}
              className="flex items-center space-x-1 text-emerald-700 font-bold hover:text-emerald-900"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Users List Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Users className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">Team Members ({users.length})</h3>
          </div>
        </div>
        <table className="w-full text-left rtl:text-right text-xs">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 border-b border-gray-100 dark:border-gray-800">
            <tr>
              <th className="py-2.5 px-4 font-semibold">Name</th>
              <th className="py-2.5 px-4 font-semibold">Email</th>
              <th className="py-2.5 px-4 font-semibold">Role</th>
              <th className="py-2.5 px-4 font-semibold">Department</th>
              <th className="py-2.5 px-4 font-semibold">Status</th>
              <th className="py-2.5 px-4 font-semibold text-right rtl:text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className="py-2.5 px-4 font-semibold text-gray-900 dark:text-gray-100">{u.name}</td>
                <td className="py-2.5 px-4 text-gray-500">{u.email}</td>
                <td className="py-2.5 px-4">
                  <span className="font-semibold text-[11px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    {u.role}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-gray-500">{u.department?.name || 'General'}</td>
                <td className="py-2.5 px-4">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-right rtl:text-left">
                  {u.role !== 'OWNER' && u.status === 'active' && (
                    <button
                      onClick={() => handleDeactivate(u.id)}
                      className="text-red-500 hover:text-red-700 font-semibold"
                    >
                      {t.deactivate}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
