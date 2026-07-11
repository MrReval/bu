import { useCallback, useEffect, useState } from 'react';
import { Check, X, Receipt, ExternalLink, RefreshCw } from 'lucide-react';
import { api, formatPrice, formatDateTime, mediaUrl } from '../../../shared/api';
import { useToast } from '../context/Toast';
import Modal from '../components/Modal';

const fa = (n) => new Intl.NumberFormat('fa-IR').format(n || 0);

const STATUS = {
  awaiting_review: { label: 'در انتظار تأیید', tone: 'bg-amber-50 text-amber-700' },
  paid: { label: 'تأیید شده', tone: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'رد شده', tone: 'bg-rose-50 text-rose-700' },
  pending: { label: 'در انتظار', tone: 'bg-slate-100 text-slate-600' },
  failed: { label: 'ناموفق', tone: 'bg-slate-100 text-slate-500' },
};

const TABS = [
  { key: 'awaiting_review', label: 'در انتظار' },
  { key: 'paid', label: 'تأیید شده' },
  { key: 'rejected', label: 'رد شده' },
  { key: 'all', label: 'همه' },
];

export default function DepositReceipts() {
  const toast = useToast();
  const [tab, setTab] = useState('awaiting_review');
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [rejectItem, setRejectItem] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = tab === 'all' ? 'all' : tab;
      const data = await api(`/admin/payments/card?status=${q}`);
      setRows(data.payments || []);
      setCounts(data.counts || {});
    } catch (e) {
      toast.show(e.message, 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => { load(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const approve = async (row) => {
    if (!confirm(`تأیید فیش ${formatPrice(row.amount)} از ${row.customer_name}؟ نوبت نهایی می‌شود.`)) return;
    setBusy(true);
    try {
      await api(`/admin/payments/${row.id}/approve`, { method: 'POST', body: JSON.stringify({}) });
      toast.show('فیش تأیید و نوبت نهایی شد');
      load();
    } catch (e) {
      toast.show(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const reject = async (e) => {
    e.preventDefault();
    if (!rejectItem) return;
    setBusy(true);
    try {
      await api(`/admin/payments/${rejectItem.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ note }),
      });
      toast.show('فیش رد شد');
      setRejectItem(null);
      setNote('');
      load();
    } catch (err) {
      toast.show(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Receipt className="text-pink-600" />
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">فیش‌های بیعانه</h1>
            <p className="text-sm text-slate-500 mt-0.5">بررسی و تأیید واریزهای کارت‌به‌کارت</p>
          </div>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
          <RefreshCw size={16} /> بروزرسانی
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 pt-4 border-b border-slate-100 flex gap-1 overflow-x-auto pb-3">
          {TABS.map((t) => {
            const active = tab === t.key;
            const count = t.key === 'all' ? counts.all : counts[t.key];
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`shrink-0 px-3.5 py-2 rounded-xl text-sm font-medium ${
                  active ? 'bg-pink-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t.label}
                {count != null && <span className={`mr-1.5 text-xs ${active ? 'text-white/80' : 'text-slate-400'}`}>{fa(count)}</span>}
              </button>
            );
          })}
        </div>

        {loading && <div className="py-16 text-center text-slate-400 text-sm">در حال بارگذاری...</div>}
        {!loading && rows.length === 0 && (
          <div className="py-16 text-center text-slate-400 text-sm">فیشی در این بخش نیست</div>
        )}

        <div className="divide-y divide-slate-100">
          {rows.map((row) => {
            const st = STATUS[row.status] || STATUS.pending;
            return (
              <div key={row.id} className="p-4 sm:p-5 flex flex-col lg:flex-row gap-4">
                <button
                  type="button"
                  onClick={() => setPreview(row)}
                  className="w-full lg:w-28 h-28 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200"
                >
                  {row.receipt_url ? (
                    <img src={mediaUrl(row.receipt_url)} alt="فیش" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">بدون تصویر</div>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-slate-800">{row.customer_name || '—'}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${st.tone}`}>{st.label}</span>
                  </div>
                  <div className="text-sm text-slate-500 space-y-0.5">
                    <div dir="ltr" className="text-right">{row.customer_phone}</div>
                    <div>مبلغ بیعانه: <strong className="text-slate-800">{formatPrice(row.amount)}</strong></div>
                    {row.start_at && <div>زمان نوبت: {formatDateTime(row.start_at)}</div>}
                    <div className="text-xs text-slate-400">ارسال فیش: {formatDateTime(row.created_at)}</div>
                    {row.admin_note && <div className="text-xs text-slate-500 mt-1">یادداشت: {row.admin_note}</div>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {row.receipt_url && (
                    <a href={mediaUrl(row.receipt_url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                      <ExternalLink size={14} /> مشاهده فیش
                    </a>
                  )}
                  {row.status === 'awaiting_review' && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => approve(row)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Check size={14} /> تأیید و نهایی‌سازی
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => { setRejectItem(row); setNote(''); }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100"
                      >
                        <X size={14} /> رد فیش
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={!!preview} onClose={() => setPreview(null)} title="پیش‌نمایش فیش" wide>
        {preview?.receipt_url && (
          <img src={mediaUrl(preview.receipt_url)} alt="فیش" className="w-full rounded-xl max-h-[70vh] object-contain bg-slate-50" />
        )}
      </Modal>

      <Modal open={!!rejectItem} onClose={() => setRejectItem(null)} title="رد فیش بیعانه">
        <form onSubmit={reject} className="space-y-4">
          <p className="text-sm text-slate-500">دلیل رد برای مشتری ارسال می‌شود تا بتواند فیش جدید بفرستد.</p>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
            placeholder="مثلاً: مبلغ اشتباه است / فیش خوانا نیست"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRejectItem(null)} className="px-4 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-100">انصراف</button>
            <button type="submit" disabled={busy} className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold disabled:opacity-50">رد فیش</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
