import { useEffect, useState } from 'react';
import { BellRing, ShieldCheck, ShieldX, Clock, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { api } from '../../../shared/api';
import { formatJalaliDateTime, parseJson, replaceGregorianDatesWithJalali } from '../../../shared/utils';
import { useToast } from '../context/Toast';
import AppointmentDetailsModal from '../components/AppointmentDetailsModal';

export default function Notifications() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aptOpen, setAptOpen] = useState(false);
  const [aptLoading, setAptLoading] = useState(false);
  const [apt, setApt] = useState(null);
  const [perm, setPerm] = useState(() => {
    if (typeof window === 'undefined') return 'default';
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });
  const toast = useToast();

  const load = () => {
    setLoading(true);
    api('/admin/notifications')
      .then(setList)
      .catch((e) => toast.show(e.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const requestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.show('مرورگر شما از اعلان پشتیبانی نمی‌کند', 'error');
      setPerm('unsupported');
      return;
    }
    try {
      const res = await Notification.requestPermission();
      setPerm(res);
      if (res === 'granted') toast.show('اعلان مرورگر فعال شد');
      if (res === 'denied') toast.show('مجوز اعلان رد شد', 'error');
    } catch {
      toast.show('امکان درخواست مجوز اعلان نبود', 'error');
    }
  };

  const markRead = async (id) => {
    try {
      await api(`/admin/notifications/${id}/read`, { method: 'PATCH' });
      setList((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    } catch (e) {
      toast.show(e.message, 'error');
    }
  };

  const markAll = async () => {
    try {
      await api('/admin/notifications/read-all', { method: 'POST' });
      load();
      toast.show('همه اعلان‌ها خوانده شد');
    } catch (e) {
      toast.show(e.message, 'error');
    }
  };

  const openAppointment = async (appointmentId) => {
    if (!appointmentId) return;
    setAptOpen(true);
    setAptLoading(true);
    setApt(null);
    try {
      const data = await api(`/admin/appointments/${appointmentId}`);
      setApt(data);
    } catch (e) {
      toast.show(e.message, 'error');
    } finally {
      setAptLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">اعلان‌ها</h1>
          <p className="text-slate-500 text-sm mt-1">اتفاقات مهم و تغییرات نوبت‌ها</p>
        </div>
        {list.some((n) => !n.read_at) && (
          <button onClick={markAll} className="text-sm text-pink-700 hover:underline">
            علامت‌گذاری همه به‌عنوان خوانده‌شده
          </button>
        )}
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-700 flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">اعلان مرورگر</p>
            {perm === 'unsupported' ? (
              <p className="text-sm text-slate-500 mt-1">مرورگر شما از اعلان پشتیبانی نمی‌کند.</p>
            ) : perm === 'granted' ? (
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                فعال است؛ با اعلان‌های جدید، نوتیفیکیشن سیستم نمایش داده می‌شود.
              </p>
            ) : perm === 'denied' ? (
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                <ShieldX className="w-4 h-4 text-red-600" />
                غیرفعال است؛ در تنظیمات مرورگر اجازه اعلان را فعال کنید.
              </p>
            ) : (
              <p className="text-sm text-slate-500 mt-1">برای نمایش اعلان‌ها در سیستم، مجوز را فعال کنید.</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={requestPermission}
          disabled={perm === 'granted' || perm === 'unsupported'}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 hover:border-pink-300 hover:bg-pink-50 disabled:opacity-60 disabled:hover:bg-transparent transition"
        >
          فعال‌سازی اعلان مرورگر
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center text-slate-500 shadow-sm">
          اعلانی وجود ندارد
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-2xl border shadow-sm transition ${
                n.read_at ? 'border-slate-200' : 'border-pink-200 shadow-pink-900/5'
              } hover:shadow-md`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        n.read_at ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-pink-50 border-pink-200 text-pink-700'
                      }`}
                    >
                      <BellRing className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 truncate">{n.title}</h3>
                        {!n.read_at && <span className="w-2 h-2 rounded-full bg-pink-600 shrink-0" aria-label="خوانده نشده" />}
                      </div>
                      <p className="text-slate-600 text-sm mt-1 leading-relaxed line-clamp-2">
                        {replaceGregorianDatesWithJalali(n.body)}
                      </p>
                      <p className="text-xs text-slate-400 mt-2 inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatJalaliDateTime(n.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {!n.read_at && (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        خواندم
                      </button>
                    )}
                    {parseJson(n.payload_json).appointment_id && (
                      <button
                        type="button"
                        onClick={() => openAppointment(parseJson(n.payload_json).appointment_id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white"
                      >
                        مشاهده نوبت
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {parseJson(n.payload_json).appointment_id && (
                  <button
                    type="button"
                    onClick={() => openAppointment(parseJson(n.payload_json).appointment_id)}
                    className="mt-4 w-full text-right text-xs font-semibold text-slate-600 hover:text-pink-700 inline-flex items-center justify-between gap-3 border-t border-slate-100 pt-3"
                  >
                    <span>برای مشاهده جزئیات نوبت کلیک کنید</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AppointmentDetailsModal
        open={aptOpen}
        onClose={() => setAptOpen(false)}
        appointment={apt}
        loading={aptLoading}
      />
    </div>
  );
}
