import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, CheckSquare, BarChart3,
  Users, Settings, LogOut, Menu, X, ChevronDown, Bell,
  ClipboardList, Shield,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const navItems = [
  { to: '/dashboard',      label: 'Dashboard',         icon: LayoutDashboard, roles: [] },
  { to: '/applications',   label: 'คำขอสินเชื่อ',       icon: FileText,        roles: [] },
  { to: '/approval-queue', label: 'คิวอนุมัติ',          icon: CheckSquare,     roles: ['CREDIT_OFFICER','SENIOR_CREDIT_OFFICER','CREDIT_SUPERVISOR','CREDIT_MANAGER','CREDIT_DIRECTOR','VP_CREDIT','CREDIT_COMMITTEE'] },
  { to: '/reports',        label: 'รายงาน',              icon: BarChart3,       roles: ['ADMIN','AUDIT','CREDIT_DIRECTOR','VP_CREDIT'] },
];

const adminItems = [
  { to: '/admin/users',          label: 'จัดการผู้ใช้',    icon: Users   },
  { to: '/admin/master-data',    label: 'Master Data',     icon: ClipboardList },
  { to: '/admin/approval-matrix',label: 'Approval Matrix', icon: Shield  },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [adminExpanded, setAdminExpanded] = useState(false);
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = user?.primaryRole === 'ADMIN';

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearAuth();
    navigate('/login');
    toast.success('ออกจากระบบแล้ว');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    clsx('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
      isActive
        ? 'bg-primary-500 text-white shadow-sm'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900');

  const visibleNav = navItems.filter(
    (item) => item.roles.length === 0 || item.roles.includes(user?.primaryRole || ''),
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={clsx(
        'flex flex-col bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0',
        sidebarOpen ? 'w-64' : 'w-16',
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          {sidebarOpen && (
            <div>
              <div className="font-bold text-gray-900 text-sm leading-tight">LOS System</div>
              <div className="text-xs text-gray-500">ระบบสินเชื่อ</div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto text-gray-400 hover:text-gray-600 p-1 rounded"
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              <item.icon size={18} className="flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}

          {/* Admin Section */}
          {isAdmin && (
            <div className="pt-3">
              {sidebarOpen && (
                <button
                  onClick={() => setAdminExpanded(!adminExpanded)}
                  className="flex items-center gap-3 w-full px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600"
                >
                  <Settings size={14} />
                  <span>Admin</span>
                  <ChevronDown size={14} className={clsx('ml-auto transition-transform', adminExpanded && 'rotate-180')} />
                </button>
              )}
              {(adminExpanded || !sidebarOpen) && adminItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                  <item.icon size={18} className="flex-shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        {/* User info */}
        <div className="border-t border-gray-200 px-3 py-3">
          <NavLink to="/profile" className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors group">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary-700 font-semibold text-sm">
                {user?.nameTh?.[0] || user?.username?.[0]?.toUpperCase()}
              </span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{user?.nameTh || user?.username}</div>
                <div className="text-xs text-gray-500 truncate">{user?.primaryRole}</div>
              </div>
            )}
          </NavLink>
          <button
            onClick={handleLogout}
            className={clsx(
              'flex items-center gap-3 w-full px-3 py-2 mt-1 rounded-lg text-sm text-red-600',
              'hover:bg-red-50 transition-colors',
            )}
          >
            <LogOut size={16} className="flex-shrink-0" />
            {sidebarOpen && <span>ออกจากระบบ</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="text-gray-400">ระบบ Loan Origination System</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="text-xs text-gray-500 border-l pl-3">
              เข้าสู่ระบบในฐานะ: <span className="font-semibold text-gray-700">{user?.username}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
