import { useEffect, useMemo, useState } from 'react';
import { Gift, Send, Cake, Users } from 'lucide-react';
import { api } from '../../../shared/api';
import { toPersianDigits } from '../../../shared/jalali';
import { useToast } from '../context/Toast';

export default function CustomerClub() {
  const [customers, setCustomers] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [audience, setAudience] = useState('all');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState([]);
  const [sending, setSending] = useState(false);
  const toast = useToast();

  const load = () => {
    api('/admin/club')
      .then((d) => {
        setCustomers(d.customers || []);
        setBirthdays(d.birthdays || []);
      })
      .catch((e) => toast.show(e.message, 'error'));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const audienceCount = useMemo(() => {
    if (audience === 'all') return customers.length;
    if (audience === 'birthday') return birthdays.length;
    return selected.length;
  }, [audience, customers, birthdays, selected]);

  const send = async () => {
    if (!message.trim()) return toast.show('متن پیام را وارد کنید', 'error');
    if (audience === 'selected' && selected.length === 0) return toast.show('حداقل یک مشتری انتخاب کنید', 'error');
    setSending(true);
    try {
      const r = await api('/admin/club/broadcast', {
        method: 'POST',
        body: JSON.stringify({ message, audience, ids: selected }),
      });
      toast.show(`ارسال شد: ${toPersianDigits(r.sent)} موفق، ${toPersianDigits(r.failed)} ناموفق از ${toPersianDigits(r.total)}`);
      setMessage('');
    } catch (e) {
      toast.show(e.message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Gift className="w-6 h-6 text-pink-600" />
        <h1 className="text-2xl font-extrabold text-slate-800">باشگاه مشتریان</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ارسال پیامک گروهی */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-pink-600" />
            <h2 className="font-bold text-slate-800">ارسال پیامک گروهی</h2>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-2">مخاطبان</label>
            <div className="flex flex-wrap gap-2">
              {[
                ['all', `همه مشتریان (${toPersianDigits(customers.length)})`],
                ['birthday', `متولدین امروز (${toPersianDigits(birthdays.length)})`],
                ['selected', 'انتخاب دستی'],
              ].map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAudience(v)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                    audience === v
                      ? 'bg-pink-600 text-white border-pink-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-pink-300'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">متن پیام</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 text-sm"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="مثال: مشتری عزیز، به مناسبت روز تولدتان ۲۰٪ تخفیف ویژه دریافت می‌کنید. منتظر شما هستیم."
            />
            <p className="text-xs text-slate-400 mt-1">پیامک از طریق سرویس‌دهنده‌ی تنظیم‌شده در بخش «پیامک» ارسال می‌شود.</p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">تعداد گیرندگان: <b>{toPersianDigits(audienceCount)}</b></span>
            <button
              onClick={send}
              disabled={sending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-60 text-white text-sm font-bold"
            >
              <Send size={16} /> {sending ? 'در حال ارسال...' : 'ارسال'}
            </button>
          </div>

          {audience === 'selected' && (
            <div className="border-t border-slate-100 pt-4 max-h-72 overflow-y-auto">
              {customers.map((c) => (
                <label key={c.id} className="flex items-center gap-3 py-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
                  <span className="text-slate-700">{c.name}</span>
                  <span className="text-slate-400 text-xs" dir="ltr">{c.phone}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* تولدهای امروز */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cake className="w-5 h-5 text-pink-600" />
            <h2 className="font-bold text-slate-800">تولدهای امروز</h2>
          </div>
          {birthdays.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              امروز تولدی ثبت نشده است.
            </div>
          ) : (
            <ul className="space-y-2">
              {birthdays.map((b) => (
                <li key={b.id} className="flex items-center justify-between text-sm bg-pink-50 rounded-xl px-3 py-2">
                  <span className="text-slate-700">{b.name}</span>
                  <span className="text-slate-400 text-xs" dir="ltr">{b.phone}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
