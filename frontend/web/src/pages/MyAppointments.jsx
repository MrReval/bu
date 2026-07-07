import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarCheck, ChevronLeft, Clock3, Receipt, ShieldCheck, XCircle } from 'lucide-react';
import { api, formatDateTime, formatPrice, getToken } from '../../../shared/api';
import { getUser, clearAuth } from '../../../shared/api';

const STATUS = {
  pending: 'در انتظار',
  confirmed: 'تأیید شده',
  in_progress: 'در حال انجام',
  completed: 'انجام شده',
  cancelled: 'لغو شده',
  no_show: 'عدم حضور',
};

export default function MyAppointments() {
  const [list, setList] = useState([]);
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    if (!getToken()) {
      nav('/login');
      return;
    }
    setLoading(true);
    api('/me/appointments')
      .then((d) => setList(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [nav]);

  const cancel = async (id) => {
    if (!confirm('نوبت لغو شود؟')) return;
    await api(`/appointments/${id}/cancel`, { method: 'PATCH' });
    setList((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a)));
  };

  const total = list.length;
  const upcoming = list.filter((a) => !['cancelled', 'completed', 'no_show'].includes(a.status)).length;
  const done = list.filter((a) => a.status === 'completed').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <aside className="space-y-4">
          <div className="rounded-3xl bg-white border border-stone-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-stone-200">
              <p className="text-xs text-stone-500">داشبورد مشتری</p>
              <p className="text-xl font-extrabold mt-1 text-stone-900 truncate">{user?.name || 'مشتری'}</p>
              <p className="text-sm text-stone-500 mt-2 truncate" dir="ltr">
                {user?.phone || user?.email || ''}
              </p>
            </div>
            <div className="p-5 grid grid-cols-3 gap-3">
              {[
                { label: 'کل', value: total },
                { label: 'آینده', value: upcoming },
                { label: 'انجام‌شده', value: done },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl bg-stone-50 border border-stone-100 p-3 text-center">
                  <p className="text-lg font-extrabold text-stone-900">{s.value}</p>
                  <p className="text-[11px] text-stone-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-stone-200 shadow-xl p-5 space-y-3">
            <Link
              to="/book"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-pink-600 text-white font-bold hover:bg-pink-700 transition"
            >
              رزرو جدید
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={() => {
                clearAuth();
                window.location.href = '/';
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-stone-200 text-stone-700 font-semibold hover:bg-stone-50 transition"
            >
              خروج از حساب
            </button>
            <p className="text-xs text-stone-500 leading-relaxed">
              اگر نیاز به تغییر شماره یا اطلاعات دارید، با پشتیبانی سالن تماس بگیرید.
            </p>
          </div>
        </aside>

        <section className="rounded-3xl bg-white border border-stone-200 shadow-xl overflow-hidden">
          <div className="p-5 sm:p-7 border-b border-stone-200 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold text-stone-900 flex items-center gap-2">
                <CalendarCheck className="w-6 h-6 text-pink-600" />
                نوبت‌های من
              </h1>
              <p className="text-stone-500 text-sm mt-2">
                وضعیت رزروها، خدمات و جزئیات هر نوبت را اینجا ببینید.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center">
              <div className="w-10 h-10 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <div className="p-10 text-center">
              <div className="rounded-3xl border-2 border-dashed border-stone-200 bg-stone-50 p-10 text-center">
              <p className="font-semibold text-stone-800">هنوز نوبتی ندارید</p>
              <p className="text-stone-500 text-sm mt-2">برای اولین رزرو، از همینجا شروع کنید.</p>
              <Link
                to="/book"
                className="inline-flex items-center justify-center gap-2 mt-5 px-6 py-3 rounded-2xl bg-pink-600 text-white font-bold hover:bg-pink-700 transition"
              >
                رزرو نوبت
                <ChevronLeft className="w-4 h-4" />
              </Link>
              </div>
            </div>
          ) : (
            <div className="p-5 sm:p-7 space-y-4">
              {list.map((a) => {
                const statusLabel = STATUS[a.status] || a.status;
                const statusStyle =
                  a.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : a.status === 'cancelled'
                      ? 'bg-rose-50 text-rose-700 border-rose-100'
                      : a.status === 'confirmed'
                        ? 'bg-sky-50 text-sky-700 border-sky-100'
                        : 'bg-amber-50 text-amber-800 border-amber-100';

                return (
                  <div
                    key={a.id}
                    className="rounded-2xl border border-stone-200 bg-white shadow-sm hover:shadow-md transition"
                  >
                    <div className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-extrabold text-stone-900">رزرو #{a.id}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-stone-600">
                            <span className="inline-flex items-center gap-2">
                              <Clock3 className="w-4 h-4 text-stone-400" />
                              {formatDateTime(a.start_at)}
                            </span>
                            <span
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-2xl border text-xs font-extrabold ${statusStyle}`}
                            >
                              {a.status === 'completed' ? (
                                <ShieldCheck className="w-4 h-4" />
                              ) : a.status === 'cancelled' ? (
                                <XCircle className="w-4 h-4" />
                              ) : (
                                <Receipt className="w-4 h-4" />
                              )}
                              {statusLabel}
                            </span>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-xs text-stone-500">مبلغ</p>
                          <p className="font-extrabold text-stone-900">{formatPrice(a.total_price)}</p>
                        </div>
                      </div>

                      {Array.isArray(a.services) && a.services.length > 0 && (
                        <ul className="mt-4 text-sm text-stone-600 space-y-1">
                          {a.services.map((s) => (
                            <li key={s.id} className="truncate">
                              {s.service_name}
                            </li>
                          ))}
                        </ul>
                      )}

                      {!['cancelled', 'completed'].includes(a.status) && (
                        <button
                          onClick={() => cancel(a.id)}
                          className="mt-4 inline-flex items-center gap-2 text-rose-700 hover:bg-rose-50 px-4 py-2 rounded-2xl text-sm font-semibold transition"
                        >
                          <XCircle className="w-4 h-4" />
                          لغو نوبت
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
