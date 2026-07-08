import { useEffect, useState } from 'react';
import { Save, CreditCard } from 'lucide-react';
import { api } from '../../../shared/api';
import { useToast } from '../context/Toast';

const field =
  'w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 text-sm';

export default function PaymentSettings() {
  const [merchant, setMerchant] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api('/admin/payment')
      .then((d) => {
        setMerchant(d.zibal_merchant || '');
        setIsEnabled(!!Number(d.is_enabled));
      })
      .catch((e) => toast.show(e.message, 'error'));
  }, []);

  const save = async () => {
    try {
      await api('/admin/payment', {
        method: 'PATCH',
        body: JSON.stringify({ zibal_merchant: merchant, is_enabled: isEnabled }),
      });
      toast.show('تنظیمات درگاه ذخیره شد');
    } catch (e) {
      toast.show(e.message, 'error');
    }
  };

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-2 mb-6">
        <CreditCard className="w-6 h-6 text-pink-600" />
        <h1 className="text-2xl font-extrabold text-slate-800">درگاه پرداخت زیبال</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <p className="text-sm text-slate-500 leading-6">
          برای دریافت بیعانه هنگام رزرو، مرچنت زیبال خود را وارد کنید. درصد بیعانه هر خدمت را در بخش «خدمات» و درصد پیش‌فرض را در «تنظیمات» مشخص کنید.
        </p>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />
          دریافت بیعانه از طریق زیبال فعال باشد
        </label>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Merchant زیبال</label>
          <input className={field} dir="ltr" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="zibal یا کد مرچنت" />
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
