import { useEffect, useMemo, useState } from 'react';
import {
  formatJalaliDateLong,
  jalaliToGregorian,
  jalaliYearOptions,
  toJalaliParts,
  todayGregorian,
} from '../../../shared/jalali';
import { jalaaliMonthLength } from 'jalaali-js';

const MONTHS = [
  { v: 1, l: 'فروردین' },
  { v: 2, l: 'اردیبهشت' },
  { v: 3, l: 'خرداد' },
  { v: 4, l: 'تیر' },
  { v: 5, l: 'مرداد' },
  { v: 6, l: 'شهریور' },
  { v: 7, l: 'مهر' },
  { v: 8, l: 'آبان' },
  { v: 9, l: 'آذر' },
  { v: 10, l: 'دی' },
  { v: 11, l: 'بهمن' },
  { v: 12, l: 'اسفند' },
];

export default function JalaliDateInput({ value, onChange, min = todayGregorian(), className = '' }) {
  const init = value ? toJalaliParts(value + 'T12:00:00') : toJalaliParts(new Date());
  const [jy, setJy] = useState(init?.year || '');
  const [jm, setJm] = useState(init?.month || '');
  const [jd, setJd] = useState(init?.day || '');

  useEffect(() => {
    if (!value) return;
    const p = toJalaliParts(value + 'T12:00:00');
    if (!p) return;
    setJy(p.year);
    setJm(p.month);
    setJd(p.day);
  }, [value]);

  const daysInMonth = useMemo(() => (jy && jm ? jalaaliMonthLength(Number(jy), Number(jm)) : 31), [jy, jm]);

  const emit = (y, m, d) => {
    if (!y || !m || !d) {
      onChange('');
      return;
    }
    const g = jalaliToGregorian(y, m, d);
    if (min && g < min) {
      // اجازه انتخاب تاریخ قبل از حداقل را نده
      return;
    }
    onChange(g);
  };

  const selectClass =
    'border-2 border-stone-100 rounded-2xl px-3 py-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400';

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <select
          value={jy}
          onChange={(e) => {
            const y = e.target.value ? Number(e.target.value) : '';
            setJy(y);
            emit(y, jm, jd);
          }}
          className={`${selectClass} min-w-[6rem]`}
        >
          <option value="">سال</option>
          {jalaliYearOptions().map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          value={jm}
          onChange={(e) => {
            const m = e.target.value ? Number(e.target.value) : '';
            setJm(m);
            emit(jy, m, jd);
          }}
          className={`${selectClass} flex-1 min-w-[8rem]`}
        >
          <option value="">ماه</option>
          {MONTHS.map((m) => (
            <option key={m.v} value={m.v}>
              {m.l}
            </option>
          ))}
        </select>

        <select
          value={jd}
          onChange={(e) => {
            const d = e.target.value ? Number(e.target.value) : '';
            setJd(d);
            emit(jy, jm, d);
          }}
          className={`${selectClass} min-w-[5rem]`}
        >
          <option value="">روز</option>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs font-semibold text-stone-500 px-2 hover:text-pink-700"
          >
            پاک
          </button>
        ) : null}
      </div>

      {value ? (
        <p className="text-sm text-pink-700 font-medium mt-2">{formatJalaliDateLong(value + 'T12:00:00')}</p>
      ) : null}
    </div>
  );
}

