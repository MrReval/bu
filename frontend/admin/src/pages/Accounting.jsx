import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Wallet, CalendarCheck, PiggyBank } from 'lucide-react';
import { api, formatPrice } from '../../../shared/api';
import { toJalaliParts, toPersianDigits } from '../../../shared/jalali';
import JalaliDateInput from '../components/JalaliDateInput';
import { useToast } from '../context/Toast';

const isoToday = () => new Date().toISOString().slice(0, 10);
const isoMonthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const monthLabel = (ym) => {
  const p = toJalaliParts(ym + '-01T12:00:00');
  if (!p) return ym;
  return toPersianDigits(`${p.year}/${String(p.month).padStart(2, '0')}`);
};

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tone}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-lg font-extrabold text-slate-800 truncate">{value}</p>
      </div>
    </div>
  );
}

export default function Accounting() {
  const [from, setFrom] = useState(isoMonthStart());
  const [to, setTo] = useState(isoToday());
  const [staffId, setStaffId] = useState('');
  const [staff, setStaff] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api('/admin/staff').then((s) => setStaff(Array.isArray(s) ? s : [])).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (from) q.set('from', from);
      if (to) q.set('to', to);
      if (staffId) q.set('staff_id', staffId);
      const d = await api(`/admin/accounting/summary?${q.toString()}`);
      setData(d);
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

  const maxMonth = useMemo(
    () => Math.max(1, ...(data?.by_month || []).map((m) => m.revenue)),
    [data]
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-6 h-6 text-pink-600" />
        <h1 className="text-2xl font-extrabold text-slate-800">حسابداری و درآمد</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 grid gap-4 md:grid-cols-4">
        <div>
          <label className="block text-sm text-slate-600 mb-1">از تاریخ</label>
          <JalaliDateInput value={from} onChange={setFrom} />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">تا تاریخ</label>
          <JalaliDateInput value={to} onChange={setTo} />
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
            onClick={load}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-60 text-white text-sm font-bold"
          >
            {loading ? 'در حال محاسبه...' : 'اعمال فیلتر'}
          </button>
        </div>
      </div>

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            <StatCard icon={Wallet} label="درآمد کل (نوبت‌های انجام‌شده)" value={`${formatPrice(data.revenue)} تومان`} tone="bg-emerald-100 text-emerald-600" />
            <StatCard icon={CalendarCheck} label="تعداد نوبت انجام‌شده" value={toPersianDigits(data.appointments)} tone="bg-sky-100 text-sky-600" />
            <StatCard icon={PiggyBank} label="بیعانه‌های دریافت‌شده" value={`${formatPrice(data.deposits)} تومان`} tone="bg-amber-100 text-amber-600" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="font-bold text-slate-800 mb-4">درآمد به تفکیک ماه</h2>
              {data.by_month.length === 0 ? (
                <p className="text-sm text-slate-400">داده‌ای در این بازه نیست.</p>
              ) : (
                <div className="space-y-3">
                  {data.by_month.map((m) => (
                    <div key={m.ym}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">{monthLabel(m.ym)}</span>
                        <span className="font-semibold text-slate-800">{formatPrice(m.revenue)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-pink-500 rounded-full"
                          style={{ width: `${(m.revenue / maxMonth) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="font-bold text-slate-800 mb-4">درآمد به تفکیک پرسنل</h2>
              {data.by_staff.length === 0 ? (
                <p className="text-sm text-slate-400">داده‌ای در این بازه نیست.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 text-xs border-b border-slate-100">
                      <th className="text-right pb-2 font-medium">پرسنل</th>
                      <th className="text-center pb-2 font-medium">نوبت</th>
                      <th className="text-left pb-2 font-medium">درآمد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_staff.map((s) => (
                      <tr key={s.staff_id} className="border-b border-slate-50 last:border-0">
                        <td className="py-2.5 text-slate-700">{s.display_name}</td>
                        <td className="py-2.5 text-center text-slate-500">{toPersianDigits(s.appointments)}</td>
                        <td className="py-2.5 text-left font-semibold text-slate-800">{formatPrice(s.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
