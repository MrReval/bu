import { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Globe,
  Package,
  MessageSquare,
  Activity,
  Target,
  Users,
  LogOut,
  ShieldCheck,
  Menu,
  X,
} from 'lucide-react';
import { clearAuth, getAdmin, isSuperAdmin } from '../api';

const allNav = [
  { to: '/', label: 'داشبورد', icon: LayoutDashboard, end: true, superOnly: true },
  { to: '/sites', label: 'وب‌سایت‌ها', icon: Globe, superOnly: true },
  { to: '/packages', label: 'پکیج‌ها', icon: Package, superOnly: true },
  { to: '/leads', label: 'سرنخ‌ها', icon: Target, superOnly: false },
  { to: '/staff', label: 'اکانت‌ها', icon: Users, superOnly: true },
  { to: '/sms', label: 'پیامک', icon: MessageSquare, superOnly: true },
  { to: '/monitoring', label: 'مانیتورینگ', icon: Activity, superOnly: true },
];

const titleFor = (path) => {
  if (path.startsWith('/sites')) return 'وب‌سایت‌ها';
  if (path.startsWith('/packages')) return 'پکیج‌ها';
  if (path.startsWith('/leads')) return 'سرنخ‌ها';
  if (path.startsWith('/staff')) return 'اکانت‌ها';
  if (path.startsWith('/sms')) return 'پیامک';
  if (path.startsWith('/monitoring')) return 'مانیتورینگ';
  return 'داشبورد';
};

export default function Layout() {
  const navigate = useNavigate();
  const loc = useLocation();
  const admin = getAdmin();
  const superUser = isSuperAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const nav = useMemo(
    () => allNav.filter((item) => superUser || !item.superOnly),
    [superUser],
  );

  const logout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  return (
    <div className="h-screen overflow-hidden lg:flex bg-slate-100" dir="rtl">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-label="بستن"
        />
      )}

      <aside
        className={`fixed lg:sticky lg:top-0 top-0 right-0 z-50 h-screen w-[17.5rem] super-bg text-slate-100 flex flex-col shrink-0 transition-transform duration-300 shadow-xl lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-6 py-5 flex items-center justify-between gap-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-brand-500" size={26} />
            <div>
              <div className="font-extrabold text-lg leading-tight">پلتفرم سالن</div>
              <div className="text-xs text-slate-400">
                {superUser ? 'پنل سوپرادمین' : 'پنل کارمند'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:bg-white/10"
            aria-label="بستن منو"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                  isActive ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-300 hover:bg-white/5'
                }`
              }
            >
              <item.icon size={19} className="shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-white/5">
            <div className="w-10 h-10 rounded-full bg-brand-600/30 text-brand-100 flex items-center justify-center font-bold text-sm shrink-0">
              {(admin?.name || admin?.email || '?').charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-100 truncate">{admin?.name || 'کاربر'}</p>
              <p className="text-xs text-slate-400 truncate">
                {superUser ? 'سوپرادمین' : 'کارمند'} · <span dir="ltr">{admin?.email}</span>
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm text-rose-300 hover:bg-rose-500/10 transition"
          >
            <LogOut size={18} />
            خروج
          </button>
        </div>
      </aside>

      <div className="flex-1 h-screen overflow-y-auto flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-700"
            aria-label="منو"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold text-slate-800">{titleFor(loc.pathname)}</span>
          <span className="w-6" />
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
