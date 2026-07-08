import { useEffect, useState } from 'react';
import { Globe, Users, CalendarCheck, Package, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api, formatDate } from '../api';
import { useToast } from '../context/Toast';

const cards = [
  { key: 'sites', label: 'کل وب‌سایت‌ها', icon: Globe, color: 'bg-brand-600' },
  { key: 'active_sites', label: 'سایت‌های فعال', icon: CheckCircle2, color: 'bg-emerald-600' },
  { key: 'customers', label: 'کل مشتریان', icon: Users, color: 'bg-sky-600' },
  { key: 'appointments', label: 'کل نوبت‌ها', icon: CalendarCheck, color: 'bg-fuchsia-600' },
  { key: 'packages', label: 'پکیج‌ها', icon: Package, color: 'bg-amber-600' },
  { key: 'expiring_soon', label: 'انقضای نزدیک (۷ روز)', icon: AlertTriangle, color: 'bg-rose-600' },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const { show } = useToast();

  useEffect(() => {
    api('/dashboard').then(setStats).catch((e) => show(e.message, 'error'));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-800 mb-6">داشبورد</h1>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.key} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${c.color} flex items-center justify-center text-white`}>
              <c.icon size={22} />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-800">
                {stats ? new Intl.NumberFormat('fa-IR').format(stats[c.key] || 0) : '—'}
              </div>
              <div className="text-sm text-slate-500">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 font-bold text-slate-700">آخرین وب‌سایت‌ها</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[34rem]">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-right px-5 sm:px-6 py-3 font-medium">نام</th>
                <th className="text-right px-5 sm:px-6 py-3 font-medium">دامنه</th>
                <th className="text-right px-5 sm:px-6 py-3 font-medium">پکیج</th>
                <th className="text-right px-5 sm:px-6 py-3 font-medium">انقضا</th>
                <th className="text-right px-5 sm:px-6 py-3 font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.recent_sites || []).map((s) => (
                <tr key={s.id} className="border-t border-slate-50">
                  <td className="px-5 sm:px-6 py-3 font-medium text-slate-700">{s.name}</td>
                  <td className="px-5 sm:px-6 py-3 text-slate-500" dir="ltr">{s.domain}</td>
                  <td className="px-5 sm:px-6 py-3 text-slate-500">{s.package_name || '—'}</td>
                  <td className="px-5 sm:px-6 py-3 text-slate-500">{formatDate(s.expires_at)}</td>
                  <td className="px-5 sm:px-6 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {s.status === 'active' ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                </tr>
              ))}
              {stats && stats.recent_sites?.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">هنوز سایتی ثبت نشده است</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
