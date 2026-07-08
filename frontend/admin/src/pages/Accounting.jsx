import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, Wallet, CalendarCheck, PiggyBank, Receipt,
  TrendingUp, TrendingDown, XCircle, UserPlus, Download, Scissors,
} from 'lucide-react';
import { api, formatPrice } from '../../../shared/api';
import {
  toJalaliParts, toPersianDigits, jalaliToGregorian, todayGregorian,
} from '../../../shared/jalali';
import JalaliDateInput from '../components/JalaliDateInput';
import { useToast } from '../context/Toast';

const shiftDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const minusOneDay = (iso) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};
const jMonthStart = (offset = 0) => {
  const p = toJalaliParts(new Date());
  let jy = p.year;
  let jm = p.month + offset;
  while (jm < 1) { jm += 12; jy -= 1; }
  while (jm > 12) { jm -= 12; jy += 1; }
  return jalaliToGregorian(jy, jm, 1);
};

const monthLabel = (ym) => {
  const p = toJalaliParts(ym + '-01T12:00:00');
  if (!p) return ym;
  return toPersianDigits(`${p.monthName} ${p.year}`);
};
const dayLabel = (iso) => {
  const p = toJalaliParts(iso + 'T12:00:00');
  if (!p) return iso;
  return toPersianDigits(`${p.day} ${p.monthName}`);
};

function growth(cur, prev) {
  if (!prev) return cur > 0 ? 100 : 0;
  return ((cur - prev) / prev) * 100;
}

function StatCard({ icon: Icon, label, value, tone, delta }) {
  const up = delta > 0;
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-400">{label}</p>
          <p className="text-lg font-extrabold text-slate-800 truncate">{value}</p>
        </div>
        {delta !== undefined && Number.isFinite(delta) && (
          <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${up ? 'bg-emerald-50 text-emerald-600' : delta < 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
            {up ? <TrendingUp size={13} /> : delta < 0 ? <TrendingDown size={13} /> : null}
            {toPersianDigits(Math.abs(Math.round(delta)))}٪
          </span>
        )}
      </div>
    </div>
  );
}

const PRESETS = [
  { key: 'this_month', label: 'این ماه', range: () => [jMonthStart(0), todayGregorian()] },
  { key: 'last_month', label: 'ماه گذشته', range: () => [jMonthStart(-1), minusOneDay(jMonthStart(0))] },
  { key: 'last7', label: '۷ روز اخیر', range: () => [shiftDays(-6), todayGregorian()] },
  { key: 'last30', label: '۳۰ روز اخیر', range: () => [shiftDays(-29), todayGregorian()] },
  { key: 'year', label: 'امسال', range: () => [jalaliToGregorian(toJalaliParts(new Date()).year, 1, 1), todayGregorian()] },
];

export default function Accounting() {
  const [from, setFrom] = useState(jMonthStart(0));
  const [to, setTo] = useState(todayGregorian());
  const [staffId, setStaffId] = useState('');
  const [staff, setStaff] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preset, setPreset] = useState('this_month');
  const toast = useToast();

  useEffect(() => {
    api('/admin/staff').then((s) => setStaff(Array.isArray(s) ? s : [])).catch(() => {});
  }, []);

  const load = async (f = from, t = to, sid = staffId) => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (f) q.set('from', f);
      if (t) q.set('to', t);
      if (sid) q.set('staff_id', sid);
      setData(await api(`/admin/accounting/summary?${q.toString()}`));
    } catch (e) {
      toast.show(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyPreset = (p) => {
    const [f, t] = p.range();
    setPreset(p.key);
    setFrom(f);
    setTo(t);
    load(f, t, staffId);
  };

  const maxDay = useMemo(() => Math.max(1, ...(data?.by_day || []).map((d) => d.revenue)), [data]);
  const staffTotal = useMemo(() => (data?.by_staff || []).reduce((a, s) => a + s.revenue, 0), [data]);

  const exportCsv = () => {
    if (!data) return;
    const rows = [['تاریخ', 'درآمد', 'تعداد نوبت']];
    (data.by_day || []).forEach((d) => rows.push([dayLabel(d.date), d.revenue, d.appointments]));
    const csv = '\uFEFF' + rows.map((r) => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `accounting-${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const revGrowth = data ? growth(data.revenue, data.prev?.revenue) : undefined;
  const aptGrowth = data ? growth(data.appointments, data.prev?.appointments) : undefined;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-pink-600" />
          <h1 className="text-2xl font-extrabold text-slate-800">حسابداری و درآمد</h1>
        </div>
        <button
          onClick={exportCsv}
          disabled={!data}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-sm font-bold"
        >
          <Download size={16} /> خروجی CSV
        </button>
      </div>

      {/* بازه‌های سریع */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => applyPreset(p)}
            className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition ${preset === p.key ? 'bg-pink-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 shadow-sm'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 grid gap-4 md:grid-cols-4">
        <div>
          <label className="block text-sm text-slate-600 mb-1">از تاریخ</label>
          <JalaliDateInput value={from} onChange={(v) => { setFrom(v); setPreset(''); }} />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">تا تاریخ</label>
          <JalaliDateInput value={to} onChange={(v) => { setTo(v); setPreset(''); }} />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">پرسنل</label>
          <select
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
          >
            <option value="">همه پرسنل</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.display_name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={() => load()}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-60 text-white text-sm font-bold"
          >
            {loading ? 'در حال محاسبه...' : 'اعمال فیلتر'}
          </button>
        </div>
      </div>

      {data && (
        <>
          {/* KPI اصلی با رشد */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
            <StatCard icon={Wallet} label="درآمد کل" value={`${formatPrice(data.revenue)} تومان`} tone="bg-emerald-100 text-emerald-600" delta={revGrowth} />
            <StatCard icon={CalendarCheck} label="نوبت انجام‌شده" value={toPersianDigits(data.appointments)} tone="bg-sky-100 text-sky-600" delta={aptGrowth} />
            <StatCard icon={Receipt} label="میانگین هر نوبت" value={`${formatPrice(data.avg_ticket)} تومان`} tone="bg-indigo-100 text-indigo-600" />
            <StatCard icon={PiggyBank} label="بیعانه دریافت‌شده" value={`${formatPrice(data.deposits)} تومان`} tone="bg-amber-100 text-amber-600" />
          </div>

          {/* آمار تکمیلی */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard icon={PiggyBank} label="بیعانه در انتظار" value={`${formatPrice(data.deposits_pending)} تومان`} tone="bg-orange-100 text-orange-600" />
            <StatCard icon={XCircle} label="نوبت‌های لغوشده" value={toPersianDigits(data.cancelled)} tone="bg-rose-100 text-rose-600" />
            <StatCard icon={UserPlus} label="مشتری جدید" value={toPersianDigits(data.new_customers)} tone="bg-fuchsia-100 text-fuchsia-600" />
            <StatCard icon={TrendingUp} label="درآمد دوره قبل" value={`${formatPrice(data.prev?.revenue || 0)} تومان`} tone="bg-slate-100 text-slate-500" />
          </div>

          {/* روند روزانه */}
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
            <h2 className="font-bold text-slate-800 mb-4">روند درآمد روزانه</h2>
            {data.by_day.length === 0 ? (
              <p className="text-sm text-slate-400">داده‌ای در این بازه نیست.</p>
            ) : (
              <div className="flex items-end gap-1 h-40 overflow-x-auto">
                {data.by_day.map((d) => (
                  <div key={d.date} className="flex flex-col items-center gap-1 flex-1 min-w-[1.1rem] group relative">
                    <div className="absolute -top-7 hidden group-hover:block bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                      {dayLabel(d.date)}: {formatPrice(d.revenue)}
                    </div>
                    <div
                      className="w-full bg-gradient-to-t from-pink-500 to-pink-300 rounded-t-md min-h-[2px] transition-all"
                      style={{ height: `${(d.revenue / maxDay) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            {/* ماهانه */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="font-bold text-slate-800 mb-4">درآمد به تفکیک ماه</h2>
              {data.by_month.length === 0 ? (
                <p className="text-sm text-slate-400">داده‌ای در این بازه نیست.</p>
              ) : (
                <div className="space-y-3">
                  {data.by_month.map((m) => {
                    const maxMonth = Math.max(1, ...data.by_month.map((x) => x.revenue));
                    return (
                      <div key={m.ym}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600">{monthLabel(m.ym)}</span>
                          <span className="font-semibold text-slate-800">{formatPrice(m.revenue)}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-pink-500 rounded-full" style={{ width: `${(m.revenue / maxMonth) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* پرسنل با سهم درصدی */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="font-bold text-slate-800 mb-4">درآمد به تفکیک پرسنل</h2>
              {data.by_staff.length === 0 ? (
                <p className="text-sm text-slate-400">داده‌ای در این بازه نیست.</p>
              ) : (
                <div className="space-y-3">
                  {data.by_staff.map((s) => {
                    const share = staffTotal > 0 ? (s.revenue / staffTotal) * 100 : 0;
                    return (
                      <div key={s.staff_id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-700">{s.display_name}</span>
                          <span className="text-slate-500">
                            <span className="font-semibold text-slate-800">{formatPrice(s.revenue)}</span>
                            <span className="text-xs text-slate-400 mr-2">({toPersianDigits(s.appointments)} نوبت)</span>
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-sky-500 rounded-full" style={{ width: `${share}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* پرفروش‌ترین خدمات */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Scissors className="w-5 h-5 text-pink-600" />
              <h2 className="font-bold text-slate-800">پرفروش‌ترین خدمات</h2>
            </div>
            {data.by_service.length === 0 ? (
              <p className="text-sm text-slate-400">داده‌ای در این بازه نیست.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs border-b border-slate-100">
                    <th className="text-right pb-2 font-medium">خدمت</th>
                    <th className="text-center pb-2 font-medium">تعداد</th>
                    <th className="text-left pb-2 font-medium">درآمد</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_service.map((s, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5 text-slate-700">{s.name}</td>
                      <td className="py-2.5 text-center text-slate-500">{toPersianDigits(s.qty)}</td>
                      <td className="py-2.5 text-left font-semibold text-slate-800">{formatPrice(s.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
