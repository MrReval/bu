import { useEffect, useState } from 'react';
import {
  SlidersHorizontal,
  Palette,
  Clock,
  CalendarCheck,
  Gem,
  Building2,
  Phone,
  MapPin,
  FileText,
  Sparkles,
  Image,
  Save,
  CheckCircle2,
  Check,
  Lock,
  CalendarClock,
  BadgeCheck,
} from 'lucide-react';
import { api, mediaUrl, formatPrice } from '../../../shared/api';
import { formatJalaliDate } from '../../../shared/jalali';
import ImageUpload from '../components/ImageUpload';
import { DAY_NAMES, normalizeBusinessHours, parseJson } from '../../../shared/utils';
import { useToast } from '../context/Toast';

const DEFAULT_HOURS = Object.fromEntries(
  DAY_NAMES.map((_, i) => [
    String(i),
    // در ایران معمولاً جمعه تعطیل است (i=5)، شنبه باز است (i=6)
    { open: i === 5 ? '' : '09:00', close: i === 5 ? '' : '21:00', closed: i === 5 },
  ])
);

export default function Settings() {
  const [s, setS] = useState(null);
  const [tab, setTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sub, setSub] = useState(null);
  const toast = useToast();

  useEffect(() => {
    api('/admin/settings')
      .then((data) => {
        const hours = normalizeBusinessHours(parseJson(data.business_hours_json, DEFAULT_HOURS));
        const rules = parseJson(data.booking_rules_json, {
          min_notice_hours: 2,
          allow_staff_selection: true,
          auto_confirm: true,
        });
        setS({ ...data, _hours: hours, _rules: rules });
      })
      .catch((e) => toast.show(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 'subscription' || sub) return;
    api('/admin/subscription')
      .then(setSub)
      .catch((e) => toast.show(e.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          name: s.name,
          phone: s.phone,
          address: s.address,
          primary_color: s.primary_color,
          secondary_color: s.secondary_color,
          accent_color: s.accent_color,
          hero_title: s.hero_title,
          hero_subtitle: s.hero_subtitle,
          hero_image: s.hero_image || '',
          logo_path: s.logo_path || '',
          about_html: s.about_html,
          is_booking_enabled: s.is_booking_enabled ? 1 : 0,
          deposit_enabled: s.deposit_enabled ? 1 : 0,
          default_deposit_percent: +(s.default_deposit_percent || 0),
          business_hours_json: JSON.stringify(normalizeBusinessHours(s._hours)),
          booking_rules_json: JSON.stringify(s._rules),
        }),
      });
      toast.show('تنظیمات ذخیره شد');
    } catch (err) {
      toast.show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const setHour = (day, field, value) => {
    setS((prev) => {
      const current = prev._hours[day] || { closed: true, open: '', close: '' };
      const next = { ...current, [field]: value };
      if (field === 'closed') {
        if (value) {
          next.open = '';
          next.close = '';
        } else {
          if (!next.open) next.open = '09:00';
          if (!next.close) next.close = '21:00';
        }
      }
      return {
        ...prev,
        _hours: normalizeBusinessHours({ ...prev._hours, [day]: next }),
      };
    });
  };

  if (loading || !s) {
    return <div className="flex items-center justify-center h-48 text-slate-500">بارگذاری...</div>;
  }

  const tabs = [
    { id: 'general', label: 'عمومی', icon: SlidersHorizontal },
    { id: 'theme', label: 'ظاهر سایت', icon: Palette },
    { id: 'hours', label: 'ساعات کاری', icon: Clock },
    { id: 'booking', label: 'رزرو', icon: CalendarCheck },
    { id: 'subscription', label: 'اشتراک', icon: Gem },
  ];

  const inputClass =
    'w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400';
  const cardClass = 'bg-white rounded-2xl shadow-sm border border-slate-200 p-6';

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">تنظیمات سالن</h1>
          <p className="text-slate-500 text-sm mt-1">پیکربندی اطلاعات، ظاهر سایت و قوانین رزرو</p>
        </div>
        <button
          type="submit"
          form="settings-form"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm"
        >
          {saving ? <CheckCircle2 className="w-4 h-4 animate-pulse" /> : <Save className="w-4 h-4" />}
          {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
        </button>
      </header>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {tabs.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                  active
                    ? 'bg-pink-600 text-white shadow-md shadow-pink-600/20'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.25 : 2} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <form id="settings-form" onSubmit={save} className="max-w-5xl space-y-6">
        {tab === 'general' && (
          <div className={cardClass}>
            <div className="flex items-center gap-2 text-slate-800 font-semibold mb-5">
              <SlidersHorizontal className="w-5 h-5 text-pink-600" />
              اطلاعات عمومی
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-2">نام سالن</label>
                <div className="relative">
                  <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    className={`${inputClass} pr-10`}
                    value={s.name}
                    onChange={(e) => setS({ ...s, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <ImageUpload
                  label={
                    <span className="flex items-center gap-1">
                      <Image className="w-4 h-4" />
                      لوگوی وب‌سایت
                    </span>
                  }
                  variant="logo"
                  value={s.logo_path}
                  previewUrl={mediaUrl(s.logo_path)}
                  uploadPath="/admin/settings/logo"
                  onChange={(data) => setS({ ...s, logo_path: data.logo_path })}
                  onClear={async () => {
                    try {
                      await api('/admin/settings', {
                        method: 'PATCH',
                        body: JSON.stringify({ logo_path: '' }),
                      });
                      setS({ ...s, logo_path: '' });
                      toast.show('لوگو حذف شد');
                    } catch (err) {
                      toast.show(err.message, 'error');
                    }
                  }}
                />
                <p className="text-xs text-slate-400 mt-2">در هدر وب‌سایت نمایش داده می‌شود. PNG شفاف توصیه می‌شود.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">تلفن</label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    className={`${inputClass} pr-10`}
                    value={s.phone || ''}
                    onChange={(e) => setS({ ...s, phone: e.target.value })}
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">آدرس</label>
                <div className="relative">
                  <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    className={`${inputClass} pr-10`}
                    value={s.address || ''}
                    onChange={(e) => setS({ ...s, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  درباره ما (HTML)
                </label>
                <textarea
                  className={`${inputClass} font-mono text-sm min-h-[180px]`}
                  rows={7}
                  value={s.about_html || ''}
                  onChange={(e) => setS({ ...s, about_html: e.target.value })}
                />
                <p className="text-xs text-slate-400 mt-2">این متن در صفحه اصلی نمایش داده می‌شود (HTML مجاز است).</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'theme' && (
          <div className={cardClass}>
            <div className="flex items-center gap-2 text-slate-800 font-semibold mb-5">
              <Palette className="w-5 h-5 text-pink-600" />
              ظاهر سایت
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { key: 'primary_color', label: 'رنگ اصلی' },
                { key: 'secondary_color', label: 'رنگ ثانویه' },
                { key: 'accent_color', label: 'رنگ تأکید' },
              ].map((c) => (
                <div key={c.key} className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-700">{c.label}</span>
                    <span className="text-xs text-slate-400" dir="ltr">
                      {s[c.key]}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="color"
                      value={s[c.key]}
                      onChange={(e) => setS({ ...s, [c.key]: e.target.value })}
                      className="h-10 w-10 rounded-full cursor-pointer border-0 bg-transparent p-0 shadow-sm ring-2 ring-slate-200 hover:ring-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
                    />
                    <div className="flex-1 h-10 rounded-xl border border-slate-200 bg-white" style={{ backgroundColor: s[c.key] }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  عنوان صفحه اصلی
                </label>
                <input className={inputClass} value={s.hero_title} onChange={(e) => setS({ ...s, hero_title: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-2">زیرعنوان</label>
                <input className={inputClass} value={s.hero_subtitle} onChange={(e) => setS({ ...s, hero_subtitle: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <ImageUpload
                  label={
                    <span className="flex items-center gap-1">
                      <Image className="w-4 h-4" />
                      تصویر Hero صفحه اصلی
                    </span>
                  }
                  value={s.hero_image}
                  previewUrl={mediaUrl(s.hero_image)}
                  uploadPath="/admin/settings/hero-image"
                  onChange={(data) => setS({ ...s, hero_image: data.hero_image })}
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'hours' && (
          <div className={cardClass}>
            <div className="flex items-center gap-2 text-slate-800 font-semibold mb-5">
              <Clock className="w-5 h-5 text-pink-600" />
              ساعات کاری
            </div>
            <div className="space-y-3">
              {DAY_NAMES.map((name, i) => {
                const day = s._hours[String(i)] || s._hours[i] || { closed: true };
                return (
                  <div key={i} className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="w-20 font-semibold text-sm text-slate-800">{name}</span>
                    <label className="flex items-center gap-2 text-sm text-slate-600 mr-auto">
                      <input
                        type="checkbox"
                        checked={!!day.closed}
                        onChange={(e) => setHour(String(i), 'closed', e.target.checked)}
                        className="accent-pink-600 w-4 h-4"
                      />
                      تعطیل
                    </label>
                    {!day.closed && (
                      <div className="flex items-center gap-2" dir="ltr">
                        <input
                          type="time"
                          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                          value={day.open || '09:00'}
                          onChange={(e) => setHour(String(i), 'open', e.target.value)}
                        />
                        <span className="text-slate-400">تا</span>
                        <input
                          type="time"
                          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                          value={day.close || '21:00'}
                          onChange={(e) => setHour(String(i), 'close', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'booking' && (
          <div className={cardClass}>
            <div className="flex items-center gap-2 text-slate-800 font-semibold mb-5">
              <CalendarCheck className="w-5 h-5 text-pink-600" />
              قوانین رزرو
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <p className="font-semibold text-slate-900">رزرو آنلاین فعال</p>
                  <p className="text-xs text-slate-500 mt-0.5">در صورت غیرفعال بودن، صفحه رزرو نمایش داده نمی‌شود.</p>
                </div>
                <input
                  type="checkbox"
                  checked={s.is_booking_enabled == 1}
                  onChange={(e) => setS({ ...s, is_booking_enabled: e.target.checked ? 1 : 0 })}
                  className="w-5 h-5 accent-pink-600"
                />
              </label>

              <label className="flex items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-2xl">
                <div>
                  <p className="font-semibold text-slate-800">انتخاب پرسنل توسط مشتری</p>
                  <p className="text-xs text-slate-500 mt-0.5">اگر خاموش باشد، سیستم به صورت خودکار پرسنل را انتخاب می‌کند.</p>
                </div>
                <input
                  type="checkbox"
                  checked={s._rules.allow_staff_selection !== false}
                  onChange={(e) => setS({ ...s, _rules: { ...s._rules, allow_staff_selection: e.target.checked } })}
                  className="w-5 h-5 accent-pink-600"
                />
              </label>

              <label className="flex items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-2xl">
                <div>
                  <p className="font-semibold text-slate-800">تأیید خودکار نوبت</p>
                  <p className="text-xs text-slate-500 mt-0.5">در صورت خاموش بودن، مدیر باید نوبت را تأیید کند.</p>
                </div>
                <input
                  type="checkbox"
                  checked={!!s._rules.auto_confirm}
                  onChange={(e) => setS({ ...s, _rules: { ...s._rules, auto_confirm: e.target.checked } })}
                  className="w-5 h-5 accent-pink-600"
                />
              </label>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="block text-xs font-medium text-slate-500 mb-2">حداقل فاصله قبل از نوبت (ساعت)</label>
                <input
                  type="number"
                  min={0}
                  className={`${inputClass} w-40`}
                  value={s._rules.min_notice_hours ?? 2}
                  onChange={(e) => setS({ ...s, _rules: { ...s._rules, min_notice_hours: +e.target.value } })}
                />
              </div>

              <label className="flex items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-2xl">
                <div>
                  <p className="font-semibold text-slate-800">دریافت بیعانه هنگام رزرو</p>
                  <p className="text-xs text-slate-500 mt-0.5">نیازمند فعال بودن درگاه پرداخت زیبال است.</p>
                </div>
                <input
                  type="checkbox"
                  checked={s.deposit_enabled == 1}
                  onChange={(e) => setS({ ...s, deposit_enabled: e.target.checked ? 1 : 0 })}
                  className="w-5 h-5 accent-pink-600"
                />
              </label>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="block text-xs font-medium text-slate-500 mb-2">درصد بیعانه پیش‌فرض (٪)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={`${inputClass} w-40`}
                  value={s.default_deposit_percent ?? 0}
                  onChange={(e) => setS({ ...s, default_deposit_percent: +e.target.value })}
                />
                <p className="text-xs text-slate-400 mt-2">اگر برای خدمتی درصد جداگانه تعیین نشده باشد، این درصد اعمال می‌شود.</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'subscription' && (
          <SubscriptionTab sub={sub} />
        )}
      </form>
    </div>
  );
}

function daysLeft(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d - new Date()) / 86400000);
}

function SubscriptionTab({ sub }) {
  if (!sub) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400">در حال بارگذاری اشتراک...</div>
    );
  }

  const left = daysLeft(sub.expires_at);
  const expired = left !== null && left < 0;
  const soon = left !== null && left >= 0 && left <= 7;
  const enabled = (sub.features || []).filter((f) => f.enabled);
  const disabled = (sub.features || []).filter((f) => !f.enabled);

  return (
    <div className="space-y-6">
      {/* کارت پلن */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-600 via-pink-500 to-fuchsia-600 text-white p-6 shadow-lg">
        <Gem className="absolute -left-6 -bottom-6 w-40 h-40 opacity-10" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-white/70 text-sm mb-1">پلن اشتراک فعلی</p>
            <h2 className="text-3xl font-extrabold">{sub.package?.name || 'بدون پلن'}</h2>
            {sub.package?.description && (
              <p className="text-white/80 text-sm mt-1 max-w-md">{sub.package.description}</p>
            )}
          </div>
          <span
            className={`px-3 py-1.5 rounded-xl text-sm font-bold ${
              expired ? 'bg-white/20' : 'bg-white text-pink-700'
            }`}
          >
            {expired ? 'منقضی شده' : sub.status === 'active' ? 'فعال' : 'غیرفعال'}
          </span>
        </div>

        <div className="relative grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
          {sub.package && (
            <div className="rounded-2xl bg-white/15 backdrop-blur px-4 py-3">
              <p className="text-white/70 text-xs mb-0.5">هزینه ماهانه</p>
              <p className="font-extrabold">{formatPrice(sub.package.price_monthly)} <span className="text-xs font-normal">تومان</span></p>
            </div>
          )}
          {sub.package && (
            <div className="rounded-2xl bg-white/15 backdrop-blur px-4 py-3">
              <p className="text-white/70 text-xs mb-0.5">هزینه سالانه</p>
              <p className="font-extrabold">{formatPrice(sub.package.price_yearly)} <span className="text-xs font-normal">تومان</span></p>
            </div>
          )}
          <div className="rounded-2xl bg-white/15 backdrop-blur px-4 py-3">
            <p className="text-white/70 text-xs mb-0.5 flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> تاریخ انقضا</p>
            <p className="font-extrabold">{formatJalaliDate(sub.expires_at)}</p>
          </div>
        </div>

        {left !== null && (
          <div className="relative mt-4">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold ${
                expired ? 'bg-rose-900/40 text-rose-50' : soon ? 'bg-amber-900/30 text-amber-50' : 'bg-white/20'
              }`}
            >
              {expired
                ? 'اشتراک شما به پایان رسیده است'
                : `${new Intl.NumberFormat('fa-IR').format(left)} روز تا پایان اشتراک`}
            </span>
          </div>
        )}
      </div>

      {/* شمارنده امکانات */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <BadgeCheck className="w-5 h-5 text-pink-600" />
            امکانات پلن شما
          </div>
          <span className="text-sm text-slate-500">
            {new Intl.NumberFormat('fa-IR').format(sub.enabled_count)} از {new Intl.NumberFormat('fa-IR').format(sub.total_count)} قابلیت فعال
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-2.5">
          {enabled.map((f) => (
            <div key={f.key} className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5">
              <span className="mt-0.5 w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" strokeWidth={3} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{f.name}</p>
                {f.description && <p className="text-xs text-slate-500 truncate">{f.description}</p>}
              </div>
            </div>
          ))}
          {disabled.map((f) => (
            <div key={f.key} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 opacity-70">
              <span className="mt-0.5 w-6 h-6 rounded-lg bg-slate-300 text-white flex items-center justify-center shrink-0">
                <Lock className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500 line-through">{f.name}</p>
                {f.description && <p className="text-xs text-slate-400 truncate">{f.description}</p>}
              </div>
            </div>
          ))}
        </div>

        {disabled.length > 0 && (
          <p className="text-xs text-slate-400 mt-4">
            برای فعال‌سازی قابلیت‌های بیشتر، پلن خود را ارتقا دهید. جهت ارتقا با پشتیبانی در تماس باشید.
          </p>
        )}
      </div>
    </div>
  );
}
