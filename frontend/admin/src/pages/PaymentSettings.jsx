import { useEffect, useState } from 'react';
import { Save, CreditCard, Landmark, Wallet } from 'lucide-react';
import { api } from '../../../shared/api';
import { useToast } from '../context/Toast';

const field =
  'w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 text-sm';

const MODES = [
  { id: 'zibal', label: 'فقط زیبال (آنلاین)', icon: Wallet, desc: 'پرداخت آنلاین بیعانه از طریق درگاه زیبال' },
  { id: 'card', label: 'فقط کارت‌به‌کارت', icon: Landmark, desc: 'مشتری واریز می‌کند و فیش می‌فرستد؛ شما تأیید می‌کنید' },
  { id: 'both', label: 'هر دو روش', icon: CreditCard, desc: 'مشتری بین زیبال و کارت‌به‌کارت انتخاب می‌کند' },
];

function formatCardInput(v) {
  const digits = String(v || '').replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export default function PaymentSettings() {
  const [merchant, setMerchant] = useState('');
  const [enamad, setEnamad] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [mode, setMode] = useState('zibal');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const toast = useToast();

  useEffect(() => {
    api('/admin/payment')
      .then((d) => {
        setMerchant(d.zibal_merchant || '');
        setEnamad(d.enamad_code || '');
        setIsEnabled(!!Number(d.is_enabled));
        setMode(d.payment_mode || 'zibal');
        setCardNumber(formatCardInput(d.card_number || ''));
        setCardHolder(d.card_holder || '');
      })
      .catch((e) => toast.show(e.message, 'error'));
  }, []);

  const save = async () => {
    if (isEnabled && !enamad.trim()) {
      return toast.show('برای فعال‌سازی بیعانه، کد اینماد الزامی است', 'error');
    }
    if (isEnabled && (mode === 'zibal' || mode === 'both') && !merchant.trim()) {
      return toast.show('برای زیبال، مرچنت الزامی است', 'error');
    }
    const digits = cardNumber.replace(/\D/g, '');
    if (isEnabled && (mode === 'card' || mode === 'both')) {
      if (digits.length !== 16) return toast.show('شماره کارت باید ۱۶ رقم باشد', 'error');
      if (!cardHolder.trim()) return toast.show('نام صاحب کارت الزامی است', 'error');
    }
    try {
      await api('/admin/payment', {
        method: 'PATCH',
        body: JSON.stringify({
          zibal_merchant: merchant,
          enamad_code: enamad,
          is_enabled: isEnabled,
          payment_mode: mode,
          card_number: digits,
          card_holder: cardHolder.trim(),
        }),
      });
      toast.show('تنظیمات درگاه ذخیره شد');
    } catch (e) {
      toast.show(e.message, 'error');
    }
  };

  const needsZibal = mode === 'zibal' || mode === 'both';
  const needsCard = mode === 'card' || mode === 'both';

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <CreditCard className="w-6 h-6 text-pink-600" />
        <h1 className="text-2xl font-extrabold text-slate-800">درگاه پرداخت و بیعانه</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <p className="text-sm text-slate-500 leading-6">
          بیعانه هنگام رزرو می‌تواند آنلاین (زیبال) یا کارت‌به‌کارت باشد. در حالت کارت‌به‌کارت، مشتری فیش را آپلود می‌کند و پس از تأیید شما نوبت نهایی می‌شود.
        </p>

        <label className="flex items-center gap-2 text-sm text-slate-700 font-medium">
          <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />
          دریافت بیعانه فعال باشد
        </label>

        <div>
          <div className="text-sm font-semibold text-slate-700 mb-2">روش دریافت بیعانه</div>
          <div className="grid gap-2">
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`flex items-start gap-3 p-4 rounded-2xl border text-right transition ${
                    active ? 'border-pink-400 bg-pink-50/60 ring-1 ring-pink-200' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{m.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-5">{m.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {needsZibal && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
            <div className="font-bold text-slate-800 text-sm">تنظیمات زیبال</div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Merchant زیبال</label>
              <input className={field} dir="ltr" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="zibal یا کد مرچنت" />
            </div>
          </div>
        )}

        {needsCard && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
            <div className="font-bold text-slate-800 text-sm">کارت‌به‌کارت</div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">شماره کارت ۱۶ رقمی</label>
              <input
                className={field}
                dir="ltr"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardInput(e.target.value))}
                placeholder="6037 .... .... ...."
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">نام صاحب کارت</label>
              <input className={field} value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} placeholder="مثلاً فاطمه رضایی" />
            </div>
            <p className="text-xs text-slate-400 leading-6">
              این اطلاعات هنگام رزرو به مشتری نمایش داده می‌شود. فیش‌های ارسالی را در بخش «فیش‌های بیعانه» بررسی کنید.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm text-slate-600 mb-1">
            کد نماد اعتماد الکترونیکی (اینماد)
            {isEnabled && <span className="text-rose-500"> *</span>}
          </label>
          <textarea
            className={`${field} font-mono`}
            dir="ltr"
            rows={4}
            value={enamad}
            onChange={(e) => setEnamad(e.target.value)}
            placeholder={'<a referrerpolicy="origin" target="_blank" href="https://trustseal.enamad.ir/..."><img src="https://trustseal.enamad.ir/logo.aspx?id=..." alt="" /></a>'}
          />
          <p className="text-xs text-slate-400 mt-1 leading-6">
            با فعال‌بودن بیعانه، این نماد در فوتر سایت نمایش داده می‌شود.
          </p>
        </div>

        <div className="flex justify-end">
          <button onClick={save} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-bold">
            <Save size={17} /> ذخیره
          </button>
        </div>
      </div>
    </div>
  );
}
