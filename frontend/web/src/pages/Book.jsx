import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, formatPrice, formatDateTime, getToken, getUser } from '../../../shared/api';
import { formatJalaliDateLong, formatJalaliTime, parseJson } from '../../../shared/utils';
import { getCategoryIconComponent } from '../../../shared/categoryIcons';
import { ArrowRight, Calendar, CheckCircle2, ChevronDown, Clock, Copy, CreditCard, Home, Landmark, Scissors, Upload, User, Wallet } from 'lucide-react';
import { todayGregorian } from '../../../shared/jalali';
import MonthAvailabilityCalendar from '../components/MonthAvailabilityCalendar';

const STEPS = ['خدمات', 'پرسنل', 'زمان', 'اطلاعات', 'تأیید'];

function formatCardDisplay(num) {
  const d = String(num || '').replace(/\D/g, '');
  return d.replace(/(\d{4})(?=\d)/g, '$1-');
}

export default function Book({ settings }) {
  const [searchParams] = useSearchParams();
  const preStaffId = searchParams.get('staff');
  const [step, setStep] = useState(0);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [staff, setStaff] = useState([]);
  const [selected, setSelected] = useState([]);
  const [staffId, setStaffId] = useState(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });
  const [done, setDone] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [openSections, setOpenSections] = useState(() => new Set());
  const timesRef = useRef(null);
  const [payMethod, setPayMethod] = useState('zibal'); // zibal | card
  const [cardPay, setCardPay] = useState(null); // { appointment, amount }
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [uploading, setUploading] = useState(false);

  const primary = settings.primary_color || '#9d174d';
  const secondary = settings.secondary_color || '#500724';
  const allowStaff = parseJson(settings.booking_rules_json).allow_staff_selection !== false;

  useEffect(() => {
    api('/services').then((d) => {
      setServices(d.services || []);
      setCategories((d.categories || []).filter((c) => Number(c.is_active) === 1));
    });
    const u = getUser();
    if (u) setForm((f) => ({ ...f, name: u.name, phone: u.phone }));
    setDate(new Date().toISOString().slice(0, 10));
  }, []);

  const groupedServices = useMemo(() => {
    const active = services.filter((s) => s.is_active);
    const groups = [];
    const sortedCats = [...categories].sort((a, b) => a.sort_order - b.sort_order);

    for (const cat of sortedCats) {
      const items = active.filter((s) => Number(s.category_id) === Number(cat.id));
      groups.push({ category: cat, services: items });
    }

    const catIds = new Set(categories.map((c) => Number(c.id)));
    const other = active.filter((s) => !s.category_id || !catIds.has(Number(s.category_id)));
    if (other.length) {
      groups.push({ category: { id: 0, name: 'سایر خدمات' }, services: other });
    }

    return groups;
  }, [services, categories]);

  const toggleSection = (categoryId) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const isSelected = (id) => selected.includes(Number(id));

  const selectedInCategory = (catServices) =>
    catServices.filter((s) => isSelected(s.id)).length;

  const toggleService = (id) => {
    const nid = Number(id);
    setSelected((prev) => (prev.includes(nid) ? prev.filter((x) => x !== nid) : [...prev, nid]));
  };

  useEffect(() => {
    if (preStaffId) setStaffId(Number(preStaffId));
  }, [preStaffId]);

  useEffect(() => {
    if (step === 1 && selected.length) {
      api(`/staff?service_id=${selected[0]}`).then((list) => {
        setStaff(list);
        if (preStaffId && list.some((s) => Number(s.id) === Number(preStaffId))) {
          setStaffId(Number(preStaffId));
        }
      }).catch(() => setStaff([]));
    }
  }, [step, selected, preStaffId]);

  useEffect(() => {
    if (step === 2 && selected.length && date) {
      const q = new URLSearchParams({ service_ids: selected.join(','), date });
      if (staffId) q.set('staff_id', staffId);
      api(`/availability?${q}`).then((d) => setSlots(d.slots || [])).catch(() => setSlots([]));
    }
  }, [step, selected, date, staffId]);

  const totalPrice = services.filter((s) => isSelected(s.id)).reduce((a, s) => a + s.price, 0);
  const totalDuration = services.filter((s) => isSelected(s.id)).reduce((a, s) => a + s.duration_minutes, 0);
  const depositEstimate =
    settings.deposit_enabled && settings.payment_enabled
      ? Math.round(
          services
            .filter((s) => isSelected(s.id))
            .reduce((a, s) => {
              const pct = Number(s.deposit_percent) > 0 ? Number(s.deposit_percent) : Number(settings.default_deposit_percent || 0);
              return a + (pct > 0 ? (s.price * pct) / 100 : 0);
            }, 0)
        )
      : 0;

  const zibalOk = Boolean(settings.zibal_enabled);
  const cardOk = Boolean(settings.card_enabled);
  const bothPay = zibalOk && cardOk;

  useEffect(() => {
    if (cardOk && !zibalOk) setPayMethod('card');
    else if (zibalOk && !cardOk) setPayMethod('zibal');
  }, [cardOk, zibalOk]);

  const submit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const body = {
        service_ids: selected,
        start_at: slot.start,
        staff_id_from_slot: slot.staff_id,
        notes_customer: form.notes,
        name: form.name,
        phone: form.phone,
      };
      const headers = { 'Content-Type': 'application/json' };
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch('/api/v1/appointments', { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const depositAmount = Number(data.deposit_amount || 0);
      const needsDeposit = settings.payment_enabled && depositAmount > 0 && data.deposit_status === 'pending';

      if (needsDeposit && payMethod === 'card' && cardOk) {
        setCardPay({ appointment: data, amount: depositAmount });
        return;
      }

      if (needsDeposit && payMethod === 'zibal' && zibalOk) {
        try {
          const pay = await fetch(`/api/v1/payments/deposit/${data.id}`, { method: 'POST', headers });
          const payData = await pay.json();
          if (pay.ok && payData.url) {
            window.location.href = payData.url;
            return;
          }
        } catch {
          // اگر پرداخت ناموفق بود، نوبت ثبت‌شده را نمایش بده
        }
      }
      setDone(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyCard = async () => {
    try {
      await navigator.clipboard.writeText(String(settings.card_number || '').replace(/\D/g, ''));
    } catch {
      // ignore
    }
  };

  const onPickReceipt = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  };

  const submitReceipt = async () => {
    if (!cardPay?.appointment?.id) return;
    if (!receiptFile) {
      setError('لطفاً تصویر فیش واریزی را انتخاب کنید');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('receipt', receiptFile);
      const headers = {};
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/v1/payments/card/${cardPay.appointment.id}`, {
        method: 'POST',
        headers,
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ارسال فیش');
      setDone({
        ...cardPay.appointment,
        deposit_status: 'awaiting_review',
        status: 'pending',
        _receiptSent: true,
      });
      setCardPay(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  if (cardPay) {
    const amount = cardPay.amount;
    return (
      <div className="min-h-[72vh] px-4 py-10 sm:py-16 bg-gradient-to-b from-stone-50 via-white to-pink-50/30">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
              <Landmark size={26} />
            </div>
            <h1 className="text-xl font-bold text-stone-900">پرداخت بیعانه کارت‌به‌کارت</h1>
            <p className="text-sm text-stone-500 mt-2 leading-relaxed">
              مبلغ بیعانه را به کارت زیر واریز کنید و تصویر فیش را ارسال کنید. پس از تأیید سالن، نوبت نهایی می‌شود.
            </p>
          </div>

          <div className="rounded-3xl bg-white border border-stone-100 shadow-sm p-5 space-y-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-500">مبلغ بیعانه</span>
              <span className="text-lg font-extrabold" style={{ color: primary }}>{formatPrice(amount)}</span>
            </div>
            <div className="rounded-2xl bg-stone-50 p-4">
              <div className="text-xs text-stone-400 mb-1">شماره کارت</div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-stone-900 tracking-wider text-lg" dir="ltr">
                  {formatCardDisplay(settings.card_number)}
                </span>
                <button type="button" onClick={copyCard} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-600">
                  <Copy size={13} /> کپی
                </button>
              </div>
              {settings.card_holder && (
                <div className="mt-2 text-sm text-stone-600">
                  به نام: <strong>{settings.card_holder}</strong>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">تصویر فیش واریزی *</label>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-stone-200 rounded-2xl p-6 cursor-pointer hover:border-pink-300 hover:bg-pink-50/30 transition">
                {receiptPreview ? (
                  <img src={receiptPreview} alt="فیش" className="max-h-48 rounded-xl object-contain" />
                ) : (
                  <>
                    <Upload className="text-stone-400" size={28} />
                    <span className="text-sm text-stone-500">انتخاب عکس فیش (JPG/PNG)</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={onPickReceipt} />
              </label>
            </div>
          </div>

          {error && <p className="text-rose-600 text-sm mb-3 text-center">{error}</p>}

          <button
            type="button"
            disabled={uploading || !receiptFile}
            onClick={submitReceipt}
            className="w-full py-4 rounded-2xl text-white font-bold disabled:opacity-50"
            style={{ backgroundColor: primary }}
          >
            {uploading ? 'در حال ارسال فیش...' : 'ارسال فیش و انتظار تأیید'}
          </button>
          <p className="text-xs text-stone-400 text-center mt-3 leading-5">
            نوبت شما ثبت شده (# {cardPay.appointment.id}) ولی تا تأیید فیش نهایی نمی‌شود.
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    const staffName = done.services?.[0]?.staff_name || slot?.staff_name;
    const serviceNames = (done.services || []).map((s) => s.service_name).filter(Boolean);
    const isConfirmed = done.status === 'confirmed' && done.deposit_status !== 'awaiting_review';
    const waitingReceipt = done.deposit_status === 'awaiting_review' || done._receiptSent;
    const loggedIn = Boolean(getToken());

    return (
      <div className="min-h-[72vh] px-4 py-14 sm:py-20 bg-gradient-to-b from-stone-50 via-white to-pink-50/30">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div
              className="w-[72px] h-[72px] mx-auto rounded-full flex items-center justify-center ring-8 ring-emerald-50"
              style={{ backgroundColor: `${primary}12` }}
            >
              <CheckCircle2 className={`w-9 h-9 ${waitingReceipt ? 'text-amber-600' : 'text-emerald-600'}`} strokeWidth={1.75} />
            </div>
            <h1 className="text-2xl sm:text-[1.75rem] font-bold text-stone-900 mt-6 tracking-tight">
              {waitingReceipt ? 'فیش ارسال شد' : 'نوبت شما ثبت شد'}
            </h1>
            <p className="text-stone-500 text-sm mt-2 leading-relaxed max-w-sm mx-auto">
              {waitingReceipt
                ? 'فیش بیعانه برای مدیر سالن ارسال شد. پس از تأیید، نوبت شما نهایی می‌شود.'
                : isConfirmed
                  ? 'نوبت تأیید شد. در زمان مقرر منتظر دیدار شما هستیم.'
                  : 'درخواست شما ثبت شد و پس از تأیید سالن، وضعیت نهایی اعلام می‌شود.'}
            </p>
          </div>

          <div className="rounded-3xl bg-white border border-stone-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between gap-3">
              <span className="text-xs text-stone-400">شماره پیگیری</span>
              <span className="text-sm font-bold text-stone-800 tracking-wide">#{done.id}</span>
            </div>

            <div className="px-5 py-5 space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-[18px] h-[18px] text-pink-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[11px] text-stone-400 mb-0.5">تاریخ</p>
                  <p className="font-semibold text-stone-900">{formatJalaliDateLong(done.start_at)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-[18px] h-[18px] text-pink-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[11px] text-stone-400 mb-0.5">ساعت</p>
                  <p className="font-semibold text-stone-900">{formatJalaliTime(done.start_at)}</p>
                </div>
              </div>

              {staffName && (
                <div className="flex items-start gap-3">
                  <User className="w-[18px] h-[18px] text-pink-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-stone-400 mb-0.5">پرسنل</p>
                    <p className="font-semibold text-stone-900">{staffName}</p>
                  </div>
                </div>
              )}

              {serviceNames.length > 0 && (
                <div className="flex items-start gap-3">
                  <Scissors className="w-[18px] h-[18px] text-pink-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-stone-400 mb-0.5">خدمات</p>
                    <p className="font-medium text-stone-800 text-sm leading-relaxed">{serviceNames.join(' · ')}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 bg-stone-50/90 border-t border-stone-100 flex items-center justify-between">
              <span className="text-sm text-stone-500">مبلغ کل</span>
              <span className="text-lg font-bold" style={{ color: primary }}>
                {formatPrice(done.total_price)}
              </span>
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
                waitingReceipt
                  ? 'bg-amber-50 text-amber-800'
                  : isConfirmed
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-800'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isConfirmed && !waitingReceipt ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {waitingReceipt ? 'در انتظار تأیید فیش' : isConfirmed ? 'تأیید شده' : 'در انتظار تأیید سالن'}
            </span>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            {loggedIn && (
              <Link
                to="/my-appointments"
                className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white text-sm font-bold shadow-sm transition hover:brightness-110"
                style={{ backgroundColor: primary }}
              >
                <Calendar className="w-4 h-4" />
                نوبت‌های من
              </Link>
            )}
            <Link
              to="/"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-stone-200 bg-white text-stone-700 text-sm font-semibold hover:bg-stone-50 transition"
            >
              <Home className="w-4 h-4" />
              صفحه اصلی
            </Link>
          </div>

          {settings.name && (
            <p className="text-center text-xs text-stone-400 mt-6">{settings.name}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="relative py-16 px-4 text-white text-center overflow-hidden" style={{ backgroundColor: primary }}>
        <h1 className="text-3xl font-bold relative z-10">رزرو آنلاین نوبت</h1>
        <p className="text-pink-100 mt-2 relative z-10">در چند قدم ساده، وقت خود را رزرو کنید</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-8 relative z-10">
        <div className="bg-white rounded-3xl shadow-xl border border-pink-50 p-6 sm:p-8">
          <div className="flex justify-between mb-8 gap-1">
            {STEPS.map((s, i) => (
              <div key={s} className="flex-1 text-center">
                <div
                  className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                    i <= step ? 'text-white' : 'bg-stone-100 text-stone-400'
                  }`}
                  style={i <= step ? { backgroundColor: primary } : {}}
                >
                  {i + 1}
                </div>
                <span className={`text-[10px] sm:text-xs ${i <= step ? 'text-stone-800 font-medium' : 'text-stone-400'}`}>{s}</span>
              </div>
            ))}
          </div>

          {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm">{error}</div>}

          {step === 0 && (
            <div className="space-y-6">
              <p className="text-sm text-stone-500 text-center">خدمات را از هر دسته انتخاب کنید (امکان انتخاب چند خدمت)</p>

              {groupedServices.length === 0 ? (
                <p className="text-center text-stone-500 py-8">خدمتی برای رزرو تعریف نشده</p>
              ) : (
                groupedServices.map(({ category, services: catServices }) => {
                  const isOpen = openSections.has(category.id);
                  const picked = selectedInCategory(catServices);
                  const CatIcon = getCategoryIconComponent(category.name);
                  return (
                    <section key={category.id} className="rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
                      <button
                        type="button"
                        onClick={() => toggleSection(category.id)}
                        aria-expanded={isOpen}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-white font-semibold text-right transition hover:brightness-110"
                        style={{ backgroundColor: primary }}
                      >
                        <ChevronDown
                          className={`w-5 h-5 text-white/90 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                          aria-hidden
                        />
                        <CatIcon className="w-5 h-5 shrink-0" strokeWidth={2} />
                        <span className="flex-1">{category.name}</span>
                        {picked > 0 && (
                          <span className="bg-white/25 text-xs px-2 py-0.5 rounded-full">{picked} انتخاب</span>
                        )}
                        <span className="text-xs font-normal opacity-80 shrink-0">{catServices.length} خدمت</span>
                      </button>
                      <div
                        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="p-3 space-y-2 bg-stone-50/50 border-t border-stone-100">
                            {catServices.length === 0 ? (
                              <p className="text-center text-stone-400 text-sm py-6">به‌زودی خدمات این بخش اضافه می‌شود</p>
                            ) : (
                              catServices.map((s) => (
                                <label
                                  key={s.id}
                                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition bg-white ${
                                    isSelected(s.id) ? 'border-pink-400 shadow-sm' : 'border-transparent hover:border-pink-200'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    className="w-5 h-5 accent-pink-600 shrink-0"
                                    checked={isSelected(s.id)}
                                    onChange={() => toggleService(s.id)}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-stone-800">{s.name}</div>
                                    {s.description && (
                                      <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{s.description}</p>
                                    )}
                                    <div className="text-sm text-stone-500 mt-1">
                                      {s.duration_minutes} دقیقه —{' '}
                                      <span className="font-medium" style={{ color: primary }}>
                                        {formatPrice(s.price)}
                                      </span>
                                    </div>
                                  </div>
                                </label>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </section>
                  );
                })
              )}

              {selected.length > 0 && (
                <div className="flex justify-between text-sm bg-pink-50 rounded-xl px-4 py-3 border border-pink-100">
                  <span className="text-stone-600">{selected.length} خدمت انتخاب شده</span>
                  <span className="font-bold" style={{ color: primary }}>
                    {formatPrice(totalPrice)} · {totalDuration} دقیقه
                  </span>
                </div>
              )}

              <button
                type="button"
                disabled={!selected.length}
                onClick={() => setStep(allowStaff ? 1 : 2)}
                className="w-full py-4 rounded-2xl text-white font-bold disabled:opacity-40 shadow-lg"
                style={{ backgroundColor: primary }}
              >
                ادامه
              </button>
            </div>
          )}

          {step === 1 && allowStaff && (
            <div className="space-y-3">
              <button type="button" onClick={() => { setStaffId(null); setStep(2); }} className="w-full p-4 border-2 border-dashed border-pink-200 rounded-2xl hover:bg-pink-50 font-medium">
                🎯 هر پرسنل آزاد
              </button>
              {staff.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setStaffId(s.id); setStep(2); }}
                  className="w-full p-4 border rounded-2xl text-right hover:border-pink-400 flex items-center gap-3"
                >
                  <span className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold" style={{ backgroundColor: s.color_hex || primary }}>
                    {s.display_name?.charAt(0)}
                  </span>
                  {s.display_name}
                </button>
              ))}
              <button type="button" onClick={() => setStep(0)} className="inline-flex items-center gap-1 text-stone-500 text-sm hover:text-stone-700">
                <ArrowRight className="w-4 h-4" />
                بازگشت
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-2">انتخاب تاریخ</label>
              <MonthAvailabilityCalendar
                value={date}
                min={todayGregorian()}
                serviceIds={selected}
                staffId={staffId}
                onSelect={(g) => {
                  setDate(g);
                  // پس از انتخاب روز، کاربر را به تایم‌ها ببریم
                  setTimeout(() => timesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                }}
              />
              {date && (
                <p className="text-sm text-pink-700 font-medium mt-3">{formatJalaliDateLong(date + 'T12:00:00')}</p>
              )}
              <p className="text-sm text-stone-500 mb-4">مدت تقریبی: {totalDuration} دقیقه</p>
              <div ref={timesRef} />
              {!date ? (
                <p className="text-center text-stone-500 py-8">یک روز را از تقویم انتخاب کنید تا ساعت‌های آزاد نمایش داده شود</p>
              ) : slots.length === 0 ? (
                <p className="text-center text-stone-500 py-8">برای این روز وقت خالی نیست</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
                  {slots.map((sl) => (
                    <button
                      key={sl.start + sl.staff_id}
                      type="button"
                      onClick={() => { setSlot(sl); setStep(3); }}
                      className="p-3 border-2 border-stone-100 rounded-xl text-sm hover:border-pink-400 hover:bg-pink-50 transition"
                    >
                      <span className="font-semibold block">{formatJalaliTime(sl.start)}</span>
                      <span className="text-stone-400 text-xs">{sl.staff_name}</span>
                    </button>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => setStep(allowStaff ? 1 : 0)} className="mt-4 inline-flex items-center gap-1 text-stone-500 text-sm hover:text-stone-700">
                <ArrowRight className="w-4 h-4" />
                بازگشت
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {!getToken() && (
                <>
                  <input placeholder="نام و نام خانوادگی" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border-2 border-stone-100 rounded-2xl p-3" />
                  <input placeholder="شماره موبایل" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border-2 border-stone-100 rounded-2xl p-3" dir="ltr" />
                </>
              )}
              <textarea placeholder="یادداشت (اختیاری)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full border-2 border-stone-100 rounded-2xl p-3" rows={3} />
              <button type="button" onClick={() => setStep(4)} className="w-full py-4 rounded-2xl text-white font-bold" style={{ backgroundColor: primary }}>
                بررسی نهایی
              </button>
            </div>
          )}

          {step === 4 && slot && (
            <div>
              <div className="bg-stone-50 rounded-2xl p-5 space-y-2 text-sm mb-6">
                <p><strong>زمان:</strong> {formatDateTime(slot.start)}</p>
                <p><strong>پرسنل:</strong> {slot.staff_name}</p>
                <p><strong>خدمات:</strong> {services.filter((s) => isSelected(s.id)).map((s) => s.name).join('، ')}</p>
                <p className="text-lg font-bold pt-2" style={{ color: primary }}>{formatPrice(totalPrice)}</p>
                {depositEstimate > 0 && (
                  <p className="text-sm font-medium text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mt-2">
                    بیعانه: {formatPrice(depositEstimate)}
                    {payMethod === 'card' && cardOk ? ' — کارت‌به‌کارت' : payMethod === 'zibal' && zibalOk ? ' — پرداخت آنلاین' : ''}
                  </p>
                )}
              </div>

              {depositEstimate > 0 && bothPay && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setPayMethod('zibal')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-sm font-semibold transition ${
                      payMethod === 'zibal' ? 'border-pink-400 bg-pink-50 text-pink-800' : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    <Wallet size={18} />
                    پرداخت آنلاین
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('card')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-sm font-semibold transition ${
                      payMethod === 'card' ? 'border-pink-400 bg-pink-50 text-pink-800' : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    <CreditCard size={18} />
                    کارت‌به‌کارت
                  </button>
                </div>
              )}

              {depositEstimate > 0 && payMethod === 'card' && cardOk && (
                <div className="mb-4 rounded-2xl bg-stone-50 border border-stone-100 p-4 text-sm">
                  <div className="font-semibold text-stone-800 mb-1">واریز به کارت سالن</div>
                  <div className="font-bold tracking-wider text-stone-900" dir="ltr">{formatCardDisplay(settings.card_number)}</div>
                  {settings.card_holder && <div className="text-stone-500 mt-1">به نام {settings.card_holder}</div>}
                  <p className="text-xs text-stone-400 mt-2 leading-5">بعد از ثبت نوبت، فیش واریزی را آپلود کنید.</p>
                </div>
              )}

              <button type="button" disabled={submitting} onClick={submit} className="w-full py-4 rounded-2xl text-white font-bold disabled:opacity-60" style={{ backgroundColor: primary }}>
                {submitting
                  ? 'در حال ثبت...'
                  : depositEstimate > 0
                    ? payMethod === 'card'
                      ? 'ثبت نوبت و ادامه واریز'
                      : 'تأیید و پرداخت بیعانه'
                    : 'تأیید و ثبت نوبت'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
