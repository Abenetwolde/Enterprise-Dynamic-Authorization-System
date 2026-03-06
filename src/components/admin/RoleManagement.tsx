import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Plus, Settings2, Trash2 } from 'lucide-react';

interface Role {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export default function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/roles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setRoles(data);
    } catch (err) {
      console.error('Failed to fetch roles', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Role Management</h2>
          <p className="text-sm text-slate-500">Define and manage system-wide access levels</p>
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400">Loading roles...</div>
        ) : roles.map((role) => (
          <div key={role.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition group">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Shield className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                  <Settings2 className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="font-bold text-slate-900 mb-1">{role.name}</h3>
            <p className="text-sm text-slate-500 mb-4 line-clamp-2">{role.description}</p>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Created: {new Date(role.created_at).toLocaleDateString()}
              </span>
              <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">
                Edit Permissions
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
