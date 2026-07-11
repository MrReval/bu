import { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  formatJalaliDate,
  formatJalaliDateLong,
  jalaliToGregorian,
  toJalaliParts,
  toPersianDigits,
  todayGregorian,
} from '../../../shared/jalali';
import { jalaaliMonthLength, toJalaali, toGregorian } from 'jalaali-js';

const MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const WEEK_HEADERS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

function persianWeekday(jy, jm, jd) {
  const g = toGregorian(jy, jm, jd);
  return (new Date(g.gy, g.gm - 1, g.gd).getDay() + 1) % 7;
}

function todayJalali() {
  const n = new Date();
  return toJalaali(n.getFullYear(), n.getMonth() + 1, n.getDate());
}

function addDaysGregorian(ymd, days) {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function JalaliDateInput({
  value,
  onChange,
  className = '',
  placeholder = 'انتخاب تاریخ',
  allowClear = true,
  showQuick = true,
}) {
  const [open, setOpen] = useState(false);
  const today = todayJalali();
  const selected = value ? toJalaliParts(`${value}T12:00:00`) : null;

  const [viewY, setViewY] = useState(selected?.year || today.jy);
  const [viewM, setViewM] = useState(selected?.month || today.jm);

  useEffect(() => {
    if (!open) return;
    if (selected) {
      setViewY(selected.year);
      setViewM(selected.month);
    } else {
      setViewY(today.jy);
      setViewM(today.jm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const daysInMonth = useMemo(() => jalaaliMonthLength(viewY, viewM), [viewY, viewM]);
  const startOffset = useMemo(() => persianWeekday(viewY, viewM, 1), [viewY, viewM]);

  const prevMonth = () => {
    if (viewM === 1) {
      setViewY((y) => y - 1);
      setViewM(12);
    } else setViewM((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewM === 12) {
      setViewY((y) => y + 1);
      setViewM(1);
    } else setViewM((m) => m + 1);
  };

  const pick = (day) => {
    onChange(jalaliToGregorian(viewY, viewM, day));
    setOpen(false);
  };

  const label = value
    ? formatJalaliDateLong(`${value}T12:00:00`)
    : placeholder;

  const quickPicks = [
    { label: 'امروز', value: todayGregorian() },
    { label: 'فردا', value: addDaysGregorian(todayGregorian(), 1) },
    { label: '۳ روز بعد', value: addDaysGregorian(todayGregorian(), 3) },
    { label: 'هفته بعد', value: addDaysGregorian(todayGregorian(), 7) },
  ];

  return (
    <div className={className}>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-right hover:border-pink-400 hover:bg-pink-50/40 transition focus:outline-none focus:ring-2 focus:ring-pink-100"
        >
          <Calendar size={16} className="text-pink-600 shrink-0" />
          <span className={`flex-1 truncate ${value ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
            {label}
          </span>
          {value && (
            <span className="text-[11px] text-slate-400 shrink-0" dir="ltr">
              {formatJalaliDate(value)}
            </span>
          )}
        </button>
        {allowClear && value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="px-3 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition"
            title="پاک کردن"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-fade-up"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">انتخاب تاریخ</h3>
              <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center justify-between mb-4">
                <button type="button" onClick={nextMonth} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600" aria-label="ماه بعد">
                  <ChevronRight size={18} />
                </button>
                <div className="text-center">
                  <div className="font-extrabold text-slate-800">
                    {MONTHS[viewM - 1]} {toPersianDigits(viewY)}
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <button type="button" onClick={() => setViewY((y) => y - 1)} className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100">سال قبل</button>
                    <button type="button" onClick={() => setViewY((y) => y + 1)} className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100">سال بعد</button>
                  </div>
                </div>
                <button type="button" onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600" aria-label="ماه قبل">
                  <ChevronLeft size={18} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEK_HEADERS.map((h) => (
                  <div key={h} className="text-center text-[11px] font-bold text-slate-400 py-1">{h}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startOffset }).map((_, i) => (
                  <div key={`e-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const isSelected = selected && selected.year === viewY && selected.month === viewM && selected.day === day;
                  const isToday = today.jy === viewY && today.jm === viewM && today.jd === day;
                  const isFriday = persianWeekday(viewY, viewM, day) === 6;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => pick(day)}
                      className={`aspect-square rounded-xl text-sm font-semibold transition ${
                        isSelected
                          ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                          : isToday
                            ? 'bg-pink-50 text-pink-700 ring-1 ring-pink-200'
                            : isFriday
                              ? 'text-rose-500 hover:bg-rose-50'
                              : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {toPersianDigits(day)}
                    </button>
                  );
                })}
              </div>
            </div>

            {showQuick && (
              <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap gap-2">
                {quickPicks.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => { onChange(q.value); setOpen(false); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                      value === q.value
                        ? 'bg-pink-600 text-white border-pink-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-pink-300 hover:text-pink-700'
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}

            <div className="px-4 pb-4 flex gap-2">
              {allowClear && (
                <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="flex-1 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-100">
                  پاک کردن
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800">
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
