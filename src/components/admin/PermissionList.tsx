import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Key, Plus, Search, Filter } from 'lucide-react';

interface Permission {
  id: number;
  resource: string;
  action: string;
  description: string;
}

export default function PermissionList() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const res = await fetch('/api/permissions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPermissions(data);
    } catch (err) {
      console.error('Failed to fetch permissions', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-slate-900">Granular Permissions</h2>
          <p className="text-xs text-slate-500">Resource-action level control definitions</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search permissions..." 
              className="pl-10 pr-4 py-2 bg-slate-50 border-transparent rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-x divide-y divide-slate-100">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400">Loading permissions...</div>
        ) : permissions.map((perm) => (
          <div key={perm.id} className="p-6 hover:bg-slate-50 transition">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded">
                <Key className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                {perm.resource}.{perm.action}
              </span>
            </div>
            <p className="text-sm text-slate-600">{perm.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
