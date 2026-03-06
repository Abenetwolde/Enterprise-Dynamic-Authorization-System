import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Shield, Key, Settings, LogOut, LayoutDashboard, FileText } from 'lucide-react';
import UserManagement from '../components/admin/UserManagement';
import RoleManagement from '../components/admin/RoleManagement';
import PermissionList from '../components/admin/PermissionList';

export default function DashboardPage() {
  const { user, logout, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, permission: null },
    { id: 'users', label: 'User Management', icon: Users, permission: 'users.read' },
    { id: 'roles', label: 'Role Management', icon: Shield, permission: 'roles.manage' },
    { id: 'permissions', label: 'Permissions', icon: Key, permission: 'roles.manage' },
    { id: 'reports', label: 'Reports', icon: FileText, permission: 'reports.view' },
    { id: 'settings', label: 'System Settings', icon: Settings, permission: 'system.settings' },
  ];

  const filteredMenu = menuItems.filter(item => !item.permission || hasPermission(item.permission));

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg">AuthNexus</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {filteredMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === item.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
              {user?.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.username}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-lg font-semibold text-slate-900">
            {menuItems.find(i => i.id === activeTab)?.label}
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
              Enterprise Edition
            </span>
          </div>
        </header>

        <div className="p-8">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-slate-900">Users</h3>
                </div>
                <p className="text-3xl font-bold text-slate-900">1,284</p>
                <p className="text-xs text-slate-500 mt-1">+12% from last month</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-slate-900">Active Roles</h3>
                </div>
                <p className="text-3xl font-bold text-slate-900">12</p>
                <p className="text-xs text-slate-500 mt-1">System defined: 3</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Key className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-slate-900">Permissions</h3>
                </div>
                <p className="text-3xl font-bold text-slate-900">48</p>
                <p className="text-xs text-slate-500 mt-1">Granular controls active</p>
              </div>
            </div>
          )}

          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'roles' && <RoleManagement />}
          {activeTab === 'permissions' && <PermissionList />}
          
          {activeTab === 'reports' && (
            <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Reports Module</h2>
              <p className="text-slate-500 max-w-md mx-auto">
                This module is restricted to users with 'reports.view' permission.
                {hasPermission('reports.export') ? (
                  <span className="text-emerald-600 font-medium block mt-2">
                    ✓ You have export privileges
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium block mt-2">
                    ⚠ Export privileges restricted
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
