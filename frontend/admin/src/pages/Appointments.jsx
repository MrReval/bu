import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CalendarDays,
  Filter,
  Phone,
  User,
  Clock,
  Banknote,
  MessageSquare,
  Inbox,
  Search,
  RefreshCcw,
  ChevronDown,
} from 'lucide-react';
import { api, formatPrice } from '../../../shared/api';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  formatJalaliDateLong,
  formatJalaliDateTime,
  formatJalaliTime,
  todayGregorian,
} from '../../../shared/utils';
import { STATUS_SELECT as STATUS_SELECT_CLASSES } from '../../../shared/statusStyles';
import { useToast } from '../context/Toast';
import { useVertical } from '../context/Vertical';
import JalaliDateInput from '../components/JalaliDateInput';
import StatusSelect from '../components/StatusSelect';
import AppointmentDetailsModal from '../components/AppointmentDetailsModal';

const QUICK_FILTERS = [
  { key: 'today', label: 'امروز' },
  { key: 'pending', label: 'در انتظار' },
  { key: 'confirmed', label: 'تأیید شده' },
  { key: 'all', label: 'همه' },
];

export default function Appointments() {
  const { labels } = useVertical();
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('');
  const [date, setDate] = useState('');
  const [q, setQ] = useState('');
  const [quick, setQuick] = useState('all');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter) params.set('status', filter);
    if (date) {
      params.set('date_from', date);
      params.set('date_to', date);
    }
    const q = params.toString() ? `?${params}` : '';
    api(`/admin/appointments${q}`)
      .then(setList)
      .catch((e) => toast.show(e.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filter, date]);

  const applyQuick = (key) => {
    setQuick(key);
    if (key === 'today') {
      setDate(todayGregorian());
      setFilter('');
    } else if (key === 'pending' || key === 'confirmed') {
      setFilter(key);
      setDate('');
    } else {
      setFilter('');
      setDate('');
    }
  };

  const groupedByDate = useMemo(() => {
    const map = new Map();
    list.forEach((a) => {
      const key = a.start_at?.slice(0, 10) || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [list]);

  const searched = useMemo(() => {
    const s = (q || '').trim();
    if (!s) return list;
    const needle = s.toLowerCase();
    return list.filter((a) => {
      const id = String(a.id || '');
      const name = String(a.customer_name || '').toLowerCase();
      const phone = String(a.customer_phone || '');
      const services = (a.services || []).map((x) => String(x.service_name || '')).join(' ').toLowerCase();
      return id.includes(needle) || name.includes(needle) || phone.includes(s) || services.includes(needle);
    });
  }, [list, q]);

  const groupedSearchedByDate = useMemo(() => {
    const map = new Map();
    searched.forEach((a) => {
      const key = a.start_at?.slice(0, 10) || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [searched]);

  const openDetail = async (id) => {
    if (!id) return;
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await api(`/admin/appointments/${id}`);
      setDetail(data);
    } catch (e) {
      toast.show(e.message, 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const setStatus = async (id, status) => {
    setSavingId(id);
    try {
      await api(`/admin/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setList((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      toast.show('وضعیت ذخیره شد');
    } catch (e) {
      toast.show(e.message, 'error');
    } finally {
      setSavingId(null);
    }
  };

  const stats = useMemo(
    () => ({
      total: searched.length,
      pending: searched.filter((a) => a.status === 'pending').length,
      revenue: searched.reduce((s, a) => s + (a.status !== 'cancelled' ? +a.total_price : 0), 0),
    }),
    [searched]
  );

  const activeFilterChips = useMemo(() => {
    const chips = [];
    const qq = (q || '').trim();
    if (qq) chips.push(`جستجو: ${qq}`);
    if (date) chips.push(`تاریخ: ${date}`);
    if (filter) chips.push(`وضعیت: ${STATUS_LABELS[filter] || filter}`);
    return chips;
  }, [q, date, filter]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">مدیریت نوبت‌ها</h1>
        <p className="text-slate-500 text-sm mt-1">برنامه‌ریزی و پیگیری {labels.appointment}‌ها</p>
      </header>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'نمایش', value: stats.total, icon: Calendar },
          { label: 'در انتظار', value: stats.pending, icon: Clock },
          { label: 'درآمد', value: formatPrice(stats.revenue), icon: Banknote, small: true },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
              <Icon className="w-5 h-5 text-pink-600 mb-2" />
              <p className={`font-bold text-slate-900 ${s.small ? 'text-base' : 'text-2xl'}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="w-full flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
            <Filter className="w-4 h-4 text-pink-600" />
            فیلترها
            {activeFilterChips.length > 0 && (
              <span className="text-xs font-medium bg-pink-50 text-pink-700 border border-pink-100 px-2 py-0.5 rounded-lg">
                {activeFilterChips.length} فعال
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                load();
              }}
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 hover:bg-white"
            >
              <RefreshCcw className="w-4 h-4" />
              بروزرسانی
            </button>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </div>

          {!filtersOpen && activeFilterChips.length > 0 && (
            <div className="w-full flex flex-wrap gap-2 pt-1">
              {activeFilterChips.slice(0, 4).map((c) => (
                <span key={c} className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded-lg">
                  {c}
                </span>
              ))}
              {activeFilterChips.length > 4 && (
                <span className="text-xs text-slate-400 px-2 py-1">…</span>
              )}
            </div>
          )}
        </button>

        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
            filtersOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden border-t border-slate-200">
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                {QUICK_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => applyQuick(f.key)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                      quick === f.key
                        ? 'bg-pink-600 text-white border-pink-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-pink-300'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1">
                  <label className="block text-xs font-medium text-slate-500 mb-2">جستجو</label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      value={q}
                      onChange={(e) => {
                        setQ(e.target.value);
                        setQuick('custom');
                      }}
                      placeholder="نام، موبایل، شناسه یا خدمت..."
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">تاریخ شمسی</label>
                  <JalaliDateInput
                    value={date}
                    onChange={(v) => {
                      setDate(v);
                      setQuick(v ? 'custom' : 'all');
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">فیلتر وضعیت</label>
                  <select
                    value={filter}
                    onChange={(e) => {
                      setFilter(e.target.value);
                      setQuick('custom');
                    }}
                    className={`w-full appearance-none rounded-xl border-2 px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 transition ${
                      filter
                        ? STATUS_SELECT_CLASSES[filter]
                        : 'bg-white border-slate-200 text-slate-700 focus:ring-pink-300'
                    }`}
                  >
                    <option value="">همه وضعیت‌ها</option>
                    {Object.keys(STATUS_LABELS).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQ('');
                    setFilter('');
                    setDate('');
                    setQuick('all');
                  }}
                  className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"
                >
                  پاک کردن فیلترها
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : searched.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
          <Inbox className="w-14 h-14 mx-auto text-slate-300 mb-4" />
          <p className="font-medium text-slate-700">نوبتی یافت نشد</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedSearchedByDate.map(([day, items]) => (
            <section key={day}>
              <div className="flex items-center gap-3 mb-4 px-1">
                <CalendarDays className="w-5 h-5 text-pink-600" />
                <div>
                  <h2 className="font-bold text-slate-900">{formatJalaliDateLong(day + 'T12:00:00')}</h2>
                  <p className="text-xs text-slate-500">{items.length} نوبت</p>
                </div>
              </div>

              <div className="space-y-3">
                {items.map((a) => (
                  <article
                    key={a.id}
                    className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 sm:p-5 hover:shadow-md hover:ring-4 hover:ring-pink-100/70 hover:border-pink-200 transition"
                  >
                    <button
                      type="button"
                      onClick={() => openDetail(a.id)}
                      className="w-full text-right"
                    >
                      <div className="flex flex-wrap gap-4 items-start">
                        <div className="w-14 h-14 rounded-2xl bg-pink-50 border border-pink-100 flex flex-col items-center justify-center shrink-0">
                          <Clock className="w-4 h-4 text-pink-600 mb-0.5" />
                          <span className="text-sm font-bold text-pink-800">{formatJalaliTime(a.start_at)}</span>
                        </div>

                        <div className="flex-1 min-w-[200px]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-400" />
                              <span className="font-bold text-slate-900">{a.customer_name}</span>
                            </span>
                            <span className="text-xs text-slate-400">#{a.id}</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                            <span className="text-sm text-slate-500 flex items-center gap-1" dir="ltr">
                              <Phone className="w-3.5 h-3.5" />
                              {a.customer_phone}
                            </span>
                            <span className="text-xs text-slate-400">{formatJalaliDateTime(a.start_at)}</span>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {a.services?.map((s) => (
                              <span
                                key={s.id}
                                className="text-xs bg-slate-50 text-slate-700 border border-slate-200 rounded-lg px-2 py-1"
                              >
                                {s.service_name}
                              </span>
                            ))}
                          </div>

                          {a.notes_customer && (
                            <div className="mt-3 text-xs flex gap-1.5 text-amber-900 bg-amber-50 rounded-xl p-3 border border-amber-100">
                              <MessageSquare className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                              <p className="leading-relaxed">{a.notes_customer}</p>
                            </div>
                          )}
                        </div>

                        <div className="w-full sm:w-52 shrink-0 space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-bold text-pink-700">{formatPrice(a.total_price)}</p>
                            <span className="text-[11px] text-slate-400">#{a.id}</span>
                          </div>

                          <div onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span
                                className={`text-xs border px-2 py-1 rounded-lg font-semibold ${
                                  STATUS_COLORS[a.status] || 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {STATUS_LABELS[a.status] || a.status}
                              </span>
                              <span className="text-[11px] text-slate-400">تغییر وضعیت</span>
                            </div>
                            <StatusSelect
                              value={a.status}
                              disabled={savingId === a.id}
                              onChange={(status) => setStatus(a.id, status)}
                              className="w-full"
                              colored={false}
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <AppointmentDetailsModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        appointment={detail}
        loading={detailLoading}
      />
    </div>
  );
}
