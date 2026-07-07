import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Users, ArrowLeft, CalendarDays } from 'lucide-react';
import { api } from '../../../shared/api';
import {
  STATUS_COLORS,
  STATUS_DOT,
  STATUS_LABELS,
  formatJalaliDateLong,
  formatJalaliDateTime,
  formatJalaliTime,
  todayGregorian,
} from '../../../shared/utils';
import StatCard from '../components/StatCard';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    const today = todayGregorian();
    api('/admin/dashboard').then(setStats);
    api(`/admin/appointments?date_from=${today}&date_to=${today}`)
      .then((list) => setRecent(list.filter((a) => a.status !== 'cancelled').slice(0, 8)))
      .catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">داشبورد</h1>
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            {formatJalaliDateLong(new Date())}
          </p>
        </div>
        <Link
          to="/appointments"
          className="inline-flex items-center gap-2 text-sm font-medium text-white bg-pink-600 px-5 py-2.5 rounded-xl hover:bg-pink-700 shadow-sm shadow-pink-600/20 transition"
        >
          مدیریت نوبت‌ها
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard label="نوبت‌های امروز" value={stats.appointments_today} icon={Calendar} tone="pink" href="/appointments" subtitle="برنامه امروز" />
        <StatCard label="در انتظار تأیید" value={stats.pending} icon={Clock} tone="amber" href="/appointments" subtitle="نیاز به بررسی" />
        <StatCard label="مشتریان" value={stats.customers} icon={Users} tone="violet" href="/customers" subtitle="ثبت‌شده در سیستم" />
      </div>

      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900">برنامه امروز</h2>
            <p className="text-xs text-slate-500 mt-0.5">نوبت‌های فعال</p>
          </div>
          <Link to="/appointments" className="text-sm text-pink-600 font-medium hover:text-pink-700 flex items-center gap-1">
            همه
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            امروز نوبت فعالی نیست
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {recent.map((a) => (
              <li key={a.id} className="px-6 py-4 flex flex-wrap items-center gap-4 hover:bg-slate-50/80 transition">
                <div className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[a.status]}`} />
                <div className="flex-1 min-w-[120px]">
                  <p className="font-semibold text-slate-800">{a.customer_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">
                    {a.services?.map((s) => s.service_name).join(' · ')}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${STATUS_COLORS[a.status]}`}>
                  {STATUS_LABELS[a.status]}
                </span>
                <div className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">{formatJalaliTime(a.start_at)}</span>
                  <span className="text-slate-400 text-xs block">{formatJalaliDateTime(a.start_at).split('،')[0]}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
