import { useEffect, useState } from 'react';
import { Save, Send, MessageSquare } from 'lucide-react';
import { api } from '../../../shared/api';
import { useToast } from '../context/Toast';

const field =
  'w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 text-sm';

const credFields = {
  melipayamak: [['apikey', 'کلید API'], ['from', 'شماره فرستنده']],
  smsir: [['apikey', 'کلید API'], ['lineNumber', 'شماره خط']],
  kavenegar: [['apikey', 'کلید API'], ['sender', 'شماره فرستنده']],
};

const events = [
  ['new_appointment', 'ثبت نوبت جدید'],
  ['status_change', 'تغییر وضعیت نوبت (تأیید/لغو)'],
];

export default function SmsSettings() {
  const [providers, setProviders] = useState({});
  const [provider, setProvider] = useState('melipayamak');
  const [isEnabled, setIsEnabled] = useState(false);
  const [credentials, setCredentials] = useState({});
  const [patterns, setPatterns] = useState({});
  const [eventsCfg, setEventsCfg] = useState({});
  const [testPhone, setTestPhone] = useState('');
  const toast = useToast();

  useEffect(() => {
    api('/admin/sms')
      .then((d) => {
        setProviders(d.providers || {});
        setProvider(d.settings.provider || 'melipayamak');
        setIsEnabled(!!Number(d.settings.is_enabled));
        setCredentials(d.settings.credentials || {});
        setPatterns(d.settings.patterns || {});
        setEventsCfg(d.settings.events || {});
      })
      .catch((e) => toast.show(e.message, 'error'));
  }, []);

  const save = async () => {
    try {
      await api('/admin/sms', {
        method: 'PATCH',
        body: JSON.stringify({ provider, is_enabled: isEnabled, credentials, patterns, events: eventsCfg }),
      });
      toast.show('تنظیمات پیامک ذخیره شد');
    } catch (e) {
      toast.show(e.message, 'error');
    }
  };

  const test = async () => {
    if (!testPhone) return toast.show('شماره را وارد کنید', 'error');
    try {
      const r = await api('/admin/sms/test', { method: 'POST', body: JSON.stringify({ phone: testPhone }) });
      toast.show(r.ok ? 'پیامک تست ارسال شد' : 'ارسال ناموفق', r.ok ? 'success' : 'error');
    } catch (e) {
      toast.show(e.message, 'error');
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-6 h-6 text-pink-600" />
        <h1 className="text-2xl font-extrabold text-slate-800">تنظیمات پیامک</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />
          ارسال پیامک فعال باشد
        </label>

        <div>
          <label className="block text-sm text-slate-600 mb-1">سرویس‌دهنده پیامک</label>
          <select className={field} value={provider} onChange={(e) => { setProvider(e.target.value); setCredentials({}); }}>
            {Object.entries(providers).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(credFields[provider] || []).map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm text-slate-600 mb-1">{label}</label>
              <input className={field} dir="ltr" value={credentials[key] || ''} onChange={(e) => setCredentials({ ...credentials, [key]: e.target.value })} />
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="text-sm font-medium text-slate-700 mb-3">رویدادهای ارسال و کد پترن</div>
          {events.map(([key, label]) => (
            <div key={key} className="flex items-center gap-3 mb-3">
              <label className="flex items-center gap-2 text-sm text-slate-600 min-w-[13rem]">
                <input
                  type="checkbox"
                  checked={eventsCfg[key] === undefined ? true : !!eventsCfg[key]}
                  onChange={(e) => setEventsCfg({ ...eventsCfg, [key]: e.target.checked })}
                />
                {label}
              </label>
              <input
                className={field}
                dir="ltr"
                placeholder="کد پترن (اختیاری)"
                value={patterns[key] || ''}
                onChange={(e) => setPatterns({ ...patterns, [key]: e.target.value })}
              />
            </div>
          ))}
          <p className="text-xs text-slate-400">اگر کد پترن خالی باشد، پیامک متنی ساده ارسال می‌شود.</p>
        </div>

        <div className="flex justify-end">
          <button onClick={save} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-bold">
            <Save size={17} /> ذخیره
          </button>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <label className="block text-sm text-slate-600 mb-1">ارسال پیامک تست</label>
          <div className="flex gap-2">
            <input className={field} dir="ltr" placeholder="09xxxxxxxxx" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
            <button onClick={test} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold whitespace-nowrap">
              <Send size={16} /> تست
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
