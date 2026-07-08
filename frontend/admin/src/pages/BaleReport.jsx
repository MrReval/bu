import { useEffect, useState } from 'react';
import { Save, Send } from 'lucide-react';
import { api } from '../../../shared/api';
import { useToast } from '../context/Toast';

const field =
  'w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 text-sm';

export default function BaleReport() {
  const [token, setToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [testing, setTesting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api('/admin/bale')
      .then((d) => {
        setToken(d.bale_token || '');
        setChatId(d.bale_chat_id || '');
        setEnabled(!!Number(d.bale_daily_enabled));
      })
      .catch((e) => toast.show(e.message, 'error'));
  }, []);

  const save = async () => {
    try {
      await api('/admin/bale', {
        method: 'PATCH',
        body: JSON.stringify({ bale_token: token, bale_chat_id: chatId, bale_daily_enabled: enabled }),
      });
      toast.show('تنظیمات گزارش بله ذخیره شد');
    } catch (e) {
      toast.show(e.message, 'error');
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const r = await api('/admin/bale/test', { method: 'POST' });
      toast.show(r.ok ? 'گزارش تست ارسال شد' : 'ارسال ناموفق بود؛ توکن/شناسه را بررسی کنید', r.ok ? 'success' : 'error');
    } catch (e) {
      toast.show(e.message, 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Send className="w-6 h-6 text-pink-600" />
        <h1 className="text-2xl font-extrabold text-slate-800">گزارش روزانه در بله</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <p className="text-sm text-slate-500 leading-7">
          گزارش روزانه‌ی عملکرد سالن (نوبت‌ها، درآمد و مشتری جدید) در پیام‌رسان بله برای شما ارسال می‌شود.
          ابتدا از <b>@BotFather</b> در بله یک ربات بسازید، سپس توکن آن و شناسه‌ی چت خود را وارد کنید.
        </p>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          ارسال گزارش روزانه فعال باشد
        </label>

        <div>
          <label className="block text-sm text-slate-600 mb-1">توکن ربات بله</label>
          <input className={field} dir="ltr" value={token} onChange={(e) => setToken(e.target.value)} placeholder="123456:ABC..." />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">شناسه چت (Chat ID)</label>
          <input className={field} dir="ltr" value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="مثال: 1234567890" />
          <p className="text-xs text-slate-400 mt-1 leading-6">
            برای دریافت شناسه چت، پیامی به ربات بفرستید و از آدرس
            <span dir="ltr" className="mx-1">https://tapi.bale.ai/bot&lt;توکن&gt;/getUpdates</span>
            مقدار chat.id را بردارید.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={test}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white text-sm font-bold"
          >
            <Send size={16} /> {testing ? 'در حال ارسال...' : 'ارسال گزارش تست'}
          </button>
          <button onClick={save} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-bold">
            <Save size={17} /> ذخیره
          </button>
        </div>
      </div>
    </div>
  );
}
