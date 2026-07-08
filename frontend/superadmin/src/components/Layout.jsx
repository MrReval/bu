import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Globe, Package, MessageSquare, LogOut, ShieldCheck } from 'lucide-react';
import { clearAuth, getAdmin } from '../api';

const nav = [
  { to: '/', label: 'داشبورد', icon: LayoutDashboard, end: true },
  { to: '/sites', label: 'وب‌سایت‌ها', icon: Globe },
  { to: '/packages', label: 'پکیج‌ها', icon: Package },
  { to: '/sms', label: 'پیامک', icon: MessageSquare },
];

export default function Layout() {
  const navigate = useNavigate();
  const admin = getAdmin();

  const logout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex" dir="rtl">
      <aside className="w-64 shrink-0 super-bg text-slate-100 flex flex-col">
        <div className="px-6 py-6 flex items-center gap-2 border-b border-white/10">
          <ShieldCheck className="text-brand-500" size={26} />
          <div>
            <div className="font-extrabold text-lg leading-tight">پلتفرم سالن</div>
            <div className="text-xs text-slate-400">پنل سوپرادمین</div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                  isActive ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-300 hover:bg-white/5'
                }`
              }
            >
              <item.icon size={19} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-slate-400 mb-2 px-2">{admin?.email}</div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm text-rose-300 hover:bg-rose-500/10 transition"
          >
            <LogOut size={18} />
            خروج
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
