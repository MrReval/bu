import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Bell,
  Scissors,
  Users,
  UserCircle,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  Image,
  MessageSquare,
  CreditCard,
  BarChart3,
  Gift,
  Star,
  QrCode,
  Send,
} from 'lucide-react';
import { api, clearAuth, getUser } from '../../../shared/api';
import { replaceGregorianDatesWithJalali } from '../../../shared/utils';

const NOTIFY_STORAGE_KEY = 'bu_admin_notified_ids_v1';

function loadNotifiedIds() {
  try {
    const raw = localStorage.getItem(NOTIFY_STORAGE_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

function saveNotifiedIds(ids) {
  try {
    localStorage.setItem(NOTIFY_STORAGE_KEY, JSON.stringify(ids.slice(-100)));
  } catch {
    // ignore
  }
}

const NAV = [
  { to: '/', label: 'داشبورد', icon: LayoutDashboard },
  { to: '/appointments', label: 'نوبت‌ها', icon: CalendarDays },
  { to: '/notifications', label: 'اعلان‌ها', icon: Bell },
  { to: '/services', label: 'خدمات', icon: Scissors, roles: ['super_admin', 'manager'] },
  { to: '/staff', label: 'پرسنل', icon: Users, roles: ['super_admin', 'manager', 'staff'] },
  { to: '/gallery', label: 'گالری سایت', icon: Image, roles: ['super_admin', 'manager'], feature: 'gallery' },
  { to: '/customers', label: 'مشتریان', icon: UserCircle, roles: ['super_admin', 'manager'] },
  { to: '/accounting', label: 'حسابداری', icon: BarChart3, roles: ['super_admin', 'manager'], feature: 'accounting' },
  { to: '/club', label: 'باشگاه مشتریان', icon: Gift, roles: ['super_admin', 'manager'], feature: 'customer_club' },
  { to: '/surveys', label: 'نظرسنجی‌ها', icon: Star, roles: ['super_admin', 'manager'], feature: 'survey' },
  { to: '/qrcode', label: 'QR کد', icon: QrCode, roles: ['super_admin', 'manager'], feature: 'qrcode' },
  { to: '/sms', label: 'پیامک', icon: MessageSquare, roles: ['super_admin', 'manager'], feature: 'sms' },
  { to: '/payment', label: 'درگاه پرداخت', icon: CreditCard, roles: ['super_admin', 'manager'], feature: 'deposit' },
  { to: '/bale', label: 'گزارش بله', icon: Send, roles: ['super_admin', 'manager'], feature: 'bale_report' },
  { to: '/settings', label: 'تنظیمات', icon: Settings, roles: ['super_admin', 'manager'] },
];

function NavLinks({ onNavigate, features }) {
  const loc = useLocation();
  const user = getUser();
  const can = (roles) => !roles || roles.includes(user?.role);
  const hasFeature = (f) => !f || (Array.isArray(features) && features.includes(f));
  const isActive = (to) => (to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to));

  return NAV.filter((n) => can(n.roles) && hasFeature(n.feature)).map((n) => {
    const Icon = n.icon;
    const active = isActive(n.to);
    return (
      <Link
        key={n.to}
        to={n.to}
        onClick={onNavigate}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          active
            ? 'bg-pink-600 text-white shadow-md shadow-pink-600/25'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <Icon className="w-5 h-5 shrink-0" strokeWidth={active ? 2.25 : 2} />
        {n.to === '/staff' && user?.role === 'staff' ? 'پروفایل من' : n.label}
      </Link>
    );
  });
}

export default function Layout({ children }) {
  const user = getUser();
  const [unread, setUnread] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [features, setFeatures] = useState(null);
  const loc = useLocation();

  useEffect(() => {
    api('/settings/public')
      .then((s) => setFeatures(Array.isArray(s?.features) ? s.features : []))
      .catch(() => setFeatures([]));
  }, []);
  const notifiedIdsRef = useRef(loadNotifiedIds());
  const firstPollRef = useRef(true);

  useEffect(() => {
    let alive = true;

    const poll = async () => {
      try {
        const list = await api('/admin/notifications');
        if (!alive) return;

        const unreadList = list.filter((n) => !n.read_at);
        setUnread(unreadList.length);

        const canNotify =
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted';

        if (!canNotify) {
          firstPollRef.current = false;
          return;
        }

        // جلوگیری از اسپم: در اولین Poll اعلان سیستم نمایش نده
        if (firstPollRef.current) {
          const ids = unreadList.map((n) => n.id);
          notifiedIdsRef.current = [...new Set([...notifiedIdsRef.current, ...ids])].slice(-100);
          saveNotifiedIds(notifiedIdsRef.current);
          firstPollRef.current = false;
          return;
        }

        const newOnes = unreadList.filter((n) => !notifiedIdsRef.current.includes(n.id));
        if (newOnes.length === 0) return;

        // حداکثر 3 اعلان در هر Poll (برای جلوگیری از انفجار اعلان‌ها)
        newOnes.slice(0, 3).forEach((n) => {
          try {
            const notif = new Notification(n.title || 'اعلان جدید', {
              body: replaceGregorianDatesWithJalali(n.body || ''),
            });
            notif.onclick = () => {
              try {
                window.focus();
              } catch {
                // ignore
              }
            };
          } catch {
            // ignore
          }
        });

        notifiedIdsRef.current = [...new Set([...notifiedIdsRef.current, ...newOnes.map((n) => n.id)])].slice(-100);
        saveNotifiedIds(notifiedIdsRef.current);
      } catch {
        // ignore
      }
    };

    poll();
    const t = setInterval(poll, 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [loc.pathname]);

  return (
    <div className="h-screen overflow-hidden lg:flex bg-slate-100">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-label="بستن"
        />
      )}

      <aside
        className={`fixed lg:sticky lg:top-0 top-0 right-0 z-50 h-screen w-[17.5rem] bg-white border-l border-slate-200 flex flex-col shrink-0 transition-transform duration-300 shadow-xl lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-600 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">پنل سالن</h1>
              <p className="text-slate-400 text-xs">مدیریت زیبایی</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <NavLinks onNavigate={() => setSidebarOpen(false)} features={features} />
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-white border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-sm">
              {user?.name?.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.role}</p>
            </div>
          </div>
          {unread > 0 && (
            <Link
              to="/notifications"
              className="flex items-center justify-center gap-2 mb-2 text-xs bg-pink-600 text-white rounded-xl px-3 py-2.5 font-medium hover:bg-pink-700 transition"
            >
              <Bell className="w-4 h-4" />
              {unread} اعلان جدید
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              clearAuth();
              window.location.href = '/admin/login';
            }}
            className="w-full flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-red-600 py-2.5 rounded-xl hover:bg-red-50 transition"
          >
            <LogOut className="w-4 h-4" />
            خروج
          </button>
        </div>
      </aside>

      <div className="flex-1 h-screen overflow-y-auto flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between lg:hidden">
          <button type="button" onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-700" aria-label="منو">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold text-slate-800">پنل مدیریت</span>
          {unread > 0 ? (
            <span className="bg-pink-600 text-white text-xs min-w-[1.25rem] h-5 px-1.5 rounded-full flex items-center justify-center">{unread}</span>
          ) : (
            <span className="w-6" />
          )}
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}
