import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../../shared/api';
import {
  jalaliToGregorian,
  toJalaliParts,
  toPersianDigits,
  todayGregorian,
} from '../../../shared/jalali';
import { jalaaliMonthLength } from 'jalaali-js';

const MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

function startMonthFromValue(value) {
  const base = value || todayGregorian();
  const p = toJalaliParts(base + 'T12:00:00');
  return { jy: p?.year || 1400, jm: p?.month || 1 };
}

export default function MonthAvailabilityCalendar({
  value,
  onSelect,
  serviceIds,
  staffId,
  min = todayGregorian(),
}) {
  const [{ jy, jm }, setYm] = useState(() => startMonthFromValue(value));
  const [busyMap, setBusyMap] = useState({}); // { 'YYYY-MM-DD': boolean } => true means has NO slots
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // اگر کاربر تاریخ را عوض کرد و رفت ماه دیگر، هدر تقویم هم همسو شود
    if (!value) return;
    const p = toJalaliParts(value + 'T12:00:00');
    if (!p) return;
    setYm((prev) => (prev.jy === p.year && prev.jm === p.month ? prev : { jy: p.year, jm: p.month }));
  }, [value]);

  const daysInMonth = useMemo(() => jalaaliMonthLength(Number(jy), Number(jm)), [jy, jm]);

  const days = useMemo(() => {
    const arr = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const g = jalaliToGregorian(jy, jm, d);
      const jsDay = new Date(g + 'T12:00:00').getDay(); // 0..6 (Sun..Sat)
      const persianWeekIndex = (jsDay + 1) % 7; // 0..6 (Sat..Fri)
      arr.push({ jd: d, g, persianWeekIndex });
    }
    return arr;
  }, [jy, jm, daysInMonth]);

  const canUse = (g) => !min || g >= min;

  const leadingBlanks = useMemo(() => {
    const first = days[0];
    return first ? first.persianWeekIndex : 0;
  }, [days]);

  useEffect(() => {
    let cancelled = false;
    if (!Array.isArray(serviceIds) || serviceIds.length === 0) return;

    const run = async () => {
      setLoading(true);
      const next = {};
      try {
        // برای جلوگیری از فشار زیاد، پشت سر هم می‌زنیم (۳۰/۳۱ درخواست)
        for (const day of days) {
          if (!canUse(day.g)) {
            next[day.g] = true; // قبل از min => غیرفعال
            continue;
          }
          const q = new URLSearchParams({ service_ids: serviceIds.join(','), date: day.g });
          if (staffId) q.set('staff_id', String(staffId));
          try {
            const res = await api(`/availability?${q}`);
            const slots = res?.slots || [];
            next[day.g] = slots.length === 0; // true => پر/بدون زمان
          } catch {
            next[day.g] = true;
          }
          if (cancelled) return;
        }
        if (!cancelled) setBusyMap(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [days, staffId, serviceIds, min]);

  const monthTitle = `${MONTHS[jm - 1]} ${toPersianDigits(jy)}`;

  const prevMonth = () =>
    setYm(({ jy, jm }) => (jm === 1 ? { jy: jy - 1, jm: 12 } : { jy, jm: jm - 1 }));
  const nextMonth = () =>
    setYm(({ jy, jm }) => (jm === 12 ? { jy: jy + 1, jm: 1 } : { jy, jm: jm + 1 }));

  return (
    <div className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-stone-200 bg-stone-50">
        <button
          type="button"
          onClick={nextMonth}
          className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-stone-200 transition"
          aria-label="ماه بعد"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="font-extrabold text-stone-900">{monthTitle}</p>
          <p className="text-xs text-stone-500 mt-0.5">
            {loading ? 'در حال بررسی ظرفیت...' : 'روزهای پر خاکستری و هاشور خورده هستند'}
          </p>
        </div>
        <button
          type="button"
          onClick={prevMonth}
          className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-stone-200 transition"
          aria-label="ماه قبل"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-7 gap-2 text-xs text-stone-500 mb-2">
          {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((w) => (
            <div key={w} className="text-center font-semibold">
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`b${i}`} className="aspect-square" />
          ))}

          {days.map((d) => {
            const selected = value === d.g;
            const disabled = busyMap[d.g] || !canUse(d.g);
            return (
              <button
                key={d.g}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(d.g)}
                className={[
                  'relative aspect-square rounded-2xl border text-sm font-bold transition overflow-hidden',
                  selected
                    ? 'border-pink-500 bg-pink-50 text-pink-800'
                    : disabled
                      ? 'border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed'
                      : 'border-stone-200 bg-white text-stone-800 hover:border-pink-300 hover:bg-pink-50',
                ].join(' ')}
              >
                {disabled && (
                  <span
                    className="absolute inset-0 opacity-40"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(135deg, rgba(0,0,0,0.15) 0, rgba(0,0,0,0.15) 6px, transparent 6px, transparent 12px)',
                    }}
                    aria-hidden
                  />
                )}
                <span className="relative">{toPersianDigits(d.jd)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

