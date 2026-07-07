import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Phone, Clock, Banknote, Layers, StickyNote } from 'lucide-react';
import { formatPrice } from '../../../shared/api';
import { STATUS_COLORS, STATUS_LABELS, formatJalaliDateTime } from '../../../shared/utils';

export default function AppointmentDetailsModal({ open, onClose, appointment, loading }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="بستن"
      />

      <div className="relative w-full max-w-2xl mt-10 rounded-2xl bg-white border border-slate-200 shadow-2xl">
        <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-slate-200">
          <div className="min-w-0">
            <h2 className="font-bold text-slate-900 truncate">جزئیات نوبت</h2>
            {appointment?.id && (
              <p className="text-xs text-slate-500 mt-0.5">#{appointment.id}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
            aria-label="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !appointment ? (
            <div className="py-10 text-center text-slate-500">نوبت یافت نشد</div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <Clock className="w-4 h-4 text-pink-600" />
                  <span className="font-semibold">{formatJalaliDateTime(appointment.start_at)}</span>
                </div>
                <span
                  className={`text-xs border px-2 py-1 rounded-lg font-semibold ${
                    STATUS_COLORS[appointment.status] || 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {STATUS_LABELS[appointment.status] || appointment.status}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                    <User className="w-4 h-4" />
                    مشتری
                  </p>
                  <p className="font-semibold text-slate-900">{appointment.customer_name}</p>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-1" dir="ltr">
                    <Phone className="w-4 h-4" />
                    {appointment.customer_phone}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                    <Banknote className="w-4 h-4" />
                    مبلغ
                  </p>
                  <p className="text-xl font-bold text-pink-700">{formatPrice(appointment.total_price)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                  <Layers className="w-4 h-4" />
                  خدمات
                </p>
                <div className="flex flex-wrap gap-2">
                  {(appointment.services || []).map((s) => (
                    <span
                      key={s.id}
                      className="text-sm bg-slate-100 text-slate-700 rounded-xl px-3 py-2 border border-slate-200"
                    >
                      {s.service_name}
                      {s.staff_name ? <span className="text-xs text-slate-500"> — {s.staff_name}</span> : null}
                    </span>
                  ))}
                </div>
              </div>

              {appointment.notes_customer ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs text-amber-800 mb-2 flex items-center gap-1 font-semibold">
                    <StickyNote className="w-4 h-4" />
                    یادداشت مشتری
                  </p>
                  <p className="text-sm text-amber-900 leading-relaxed">{appointment.notes_customer}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
}

