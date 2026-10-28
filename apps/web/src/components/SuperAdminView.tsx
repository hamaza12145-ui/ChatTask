'use client';
import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Database,
  Layers,
  CheckCircle,
  AlertOctagon,
  FileText,
} from 'lucide-react';

export const SuperAdminView: React.FC = () => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [migrations, setMigrations] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [tList, mList] = await Promise.all([
        api.get<any[]>('/super-admin/tenants'),
        api.get<any[]>('/super-admin/migrations'),
      ]);
      setTenants(tList);
      setMigrations(mList);
    } catch (err) {
      console.error('Error fetching super-admin data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/super-admin/tenants', {
        name,
        subdomain,
        admin_name: adminName,
        admin_email: adminEmail,
        admin_password: adminPassword,
      });
      setShowCreateModal(false);
      setName('');
      setSubdomain('');
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
      loadData();
      alert(`Tenant '${subdomain}' provisioned and activated successfully!`);
    } catch (err: any) {
      alert(err.message || 'Provisioning failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (tenantId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.patch(`/super-admin/tenants/${tenantId}/status`, { status: nextStatus });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-2 rtl:space-x-reverse">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            <span>Multi-Tenant Control Plane</span>
          </h2>
          <p className="text-xs text-gray-500">Database-per-tenant cluster manager & provisioner</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-lg font-semibold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Provision Tenant</span>
        </button>
      </div>

      {/* Tenants List */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Layers className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">Active Tenant Databases</h3>
          </div>
          <button onClick={loadData} className="text-gray-400 hover:text-gray-600">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <table className="w-full text-left rtl:text-right text-xs">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 border-b border-gray-100 dark:border-gray-800">
            <tr>
              <th className="py-2.5 px-4 font-semibold">Tenant Name</th>
              <th className="py-2.5 px-4 font-semibold">Subdomain</th>
              <th className="py-2.5 px-4 font-semibold">PostgreSQL Database</th>
              <th className="py-2.5 px-4 font-semibold">Plan</th>
              <th className="py-2.5 px-4 font-semibold">Schema Version</th>
              <th className="py-2.5 px-4 font-semibold">Status</th>
              <th className="py-2.5 px-4 font-semibold text-right rtl:text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {tenants.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className="py-2.5 px-4 font-semibold text-gray-900 dark:text-gray-100">{t.name}</td>
                <td className="py-2.5 px-4 font-mono text-purple-600 dark:text-purple-400">{t.subdomain}</td>
                <td className="py-2.5 px-4 font-mono text-gray-500">{t.db_name}</td>
                <td className="py-2.5 px-4 capitalize">{t.plan}</td>
                <td className="py-2.5 px-4 font-mono">v{t.schema_version}</td>
                <td className="py-2.5 px-4">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      t.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-right rtl:text-left">
                  <button
                    onClick={() => handleToggleStatus(t.id, t.status)}
                    className="text-xs font-semibold text-purple-600 hover:text-purple-800"
                  >
                    {t.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Migration Log */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center space-x-2 rtl:space-x-reverse">
          <Database className="w-4 h-4 text-purple-600" />
          <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">Cross-Tenant Migration Log</h3>
        </div>
        <div className="p-4 divide-y divide-gray-100 dark:divide-gray-800 text-xs">
          {migrations.map((m) => (
            <div key={m.id} className="py-2 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{m.migration_name}</span>
                <span className="text-gray-400 text-[10px] ml-2">Tenant: {m.tenant_id}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {m.status}
              </span>
            </div>
          ))}
          {migrations.length === 0 && <div className="text-gray-400 italic">No migrations logged</div>}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-gray-200 dark:border-gray-800 text-xs">
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">Provision New Tenant Database</h3>
            <form onSubmit={handleCreateTenant} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Company Name (e.g. Initech)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg"
              />
              <input
                type="text"
                required
                placeholder="Subdomain (e.g. initech)"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg font-mono"
              />
              <input
                type="text"
                required
                placeholder="First Admin Name"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg"
              />
              <input
                type="email"
                required
                placeholder="First Admin Email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg"
              />
              <input
                type="password"
                required
                placeholder="First Admin Password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg"
              />
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold"
                >
                  {isSubmitting ? 'Provisioning DB...' : 'Create Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
