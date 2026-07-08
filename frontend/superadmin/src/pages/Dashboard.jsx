import { useEffect, useState } from 'react';
import {
  Globe, Users, CalendarCheck, AlertTriangle, CheckCircle2,
  Wallet, TrendingUp, Clock, Phone,
} from 'lucide-react';
import { api, formatPrice, formatDate } from '../api';
import { useToast } from '../context/Toast';

const fa = (n) => new Intl.NumberFormat('fa-IR').format(n || 0);

const CARDS = [
  { key: 'total_revenue', label: 'درآمد کل پلتفرم', icon: Wallet, color: 'bg-emerald-600', money: true },
  { key: 'revenue_month', label: 'درآمد این ماه', icon: TrendingUp, color: 'bg-teal-600', money: true },
  { key: 'sites', label: 'کل وب‌سایت‌ها', icon: Globe, color: 'bg-brand-600' },
  { key: 'active_sites', label: 'سایت‌های فعال', icon: CheckCircle2, color: 'bg-sky-600' },
  { key: 'customers', label: 'کل مشتریان', icon: Users, color: 'bg-fuchsia-600' },
  { key: 'appointments_today', label: 'نوبت‌های امروز', icon: CalendarCheck, color: 'bg-indigo-600' },
];

function expiryTone(s) {
  if (s.is_expired) return 'bg-rose-50 text-rose-700';
  if (!s.expires_at) return 'bg-slate-50 text-slate-500';
  const days = (new Date(s.expires_at) - new Date()) / 86400000;
  if (days <= 7) return 'bg-amber-50 text-amber-700';
  return 'bg-slate-50 text-slate-500';
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const { show } = useToast();

  useEffect(() => {
    api('/dashboard').then(setData).catch((e) => show(e.message, 'error'));
  }, []);

  const t = data?.totals;
  const sites = data?.sites || [];

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-800 mb-6">داشبورد مدیریت</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {CARDS.map((c) => (
          <div key={c.key} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${c.color} flex items-center justify-center text-white shrink-0`}>
              <c.icon size={22} />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-extrabold text-slate-800 truncate">
                {t ? (c.money ? formatPrice(t[c.key]) : fa(t[c.key])) : '—'}
              </div>
              <div className="text-sm text-slate-500">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* هشدارها */}
      {t && (t.expiring_soon > 0 || t.expired_sites > 0 || t.suspended_sites > 0) && (
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle className="text-amber-500" />
            <div><div className="font-bold text-amber-700">{fa(t.expiring_soon)}</div><div className="text-xs text-amber-600">انقضای نزدیک (۷ روز)</div></div>
          </div>
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3">
            <Clock className="text-rose-500" />
            <div><div className="font-bold text-rose-700">{fa(t.expired_sites)}</div><div className="text-xs text-rose-600">منقضی‌شده</div></div>
          </div>
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
            <Globe className="text-slate-500" />
            <div><div className="font-bold text-slate-700">{fa(t.suspended_sites)}</div><div className="text-xs text-slate-500">غیرفعال</div></div>
          </div>
        </div>
      )}

      {/* جدول کامل سالن‌ها */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 font-bold text-slate-700 flex items-center justify-between">
          <span>سالن‌ها (به ترتیب درآمد)</span>
          <span className="text-xs font-normal text-slate-400">{fa(sites.length)} سالن</span>
        </div>

        {/* دسکتاپ */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm min-w-[52rem]">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-right px-5 py-3 font-medium">سالن</th>
                <th className="text-right px-5 py-3 font-medium">مدیر</th>
                <th className="text-right px-5 py-3 font-medium">پکیج</th>
                <th className="text-center px-5 py-3 font-medium">مشتری</th>
                <th className="text-center px-5 py-3 font-medium">نوبت</th>
                <th className="text-left px-5 py-3 font-medium">درآمد</th>
                <th className="text-right px-5 py-3 font-medium">انقضا</th>
                <th className="text-right px-5 py-3 font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-700">{s.name}</div>
                    <div className="text-xs text-slate-400" dir="ltr">{s.domain}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-slate-600">{s.admin_name || '—'}</div>
                    {s.admin_phone && (
                      <div className="text-xs text-slate-400 flex items-center gap-1" dir="ltr">
                        <Phone size={11} /> {s.admin_phone}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{s.package_name || '—'}</td>
                  <td className="px-5 py-3 text-center text-slate-600">{fa(s.customers_count)}</td>
                  <td className="px-5 py-3 text-center text-slate-600">{fa(s.appointments_count)}</td>
                  <td className="px-5 py-3 text-left font-semibold text-slate-800">{formatPrice(s.revenue)}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-lg text-xs ${expiryTone(s)}`}>{formatDate(s.expires_at)}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {s.status === 'active' ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                </tr>
              ))}
              {data && sites.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">هنوز سالنی ثبت نشده است</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* موبایل: کارت‌ها */}
        <div className="md:hidden divide-y divide-slate-100">
          {sites.map((s) => (
            <div key={s.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 truncate">{s.name}</div>
                  <div className="text-xs text-slate-400 truncate" dir="ltr">{s.domain}</div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${s.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {s.status === 'active' ? 'فعال' : 'غیرفعال'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div>مدیر: <span className="text-slate-700">{s.admin_name || '—'}</span></div>
                <div dir="ltr" className="text-left">{s.admin_phone || '—'}</div>
                <div>پکیج: <span className="text-slate-700">{s.package_name || '—'}</span></div>
                <div>انقضا: {formatDate(s.expires_at)}</div>
                <div>مشتری: {fa(s.customers_count)}</div>
                <div>نوبت: {fa(s.appointments_count)}</div>
              </div>
              <div className="mt-2 text-sm font-semibold text-emerald-700">{formatPrice(s.revenue)}</div>
            </div>
          ))}
          {data && sites.length === 0 && (
            <div className="px-6 py-8 text-center text-slate-400">هنوز سالنی ثبت نشده است</div>
          )}
        </div>
      </div>
    </div>
  );
}
