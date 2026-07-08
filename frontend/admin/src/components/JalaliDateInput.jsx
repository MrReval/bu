import { useEffect, useState } from 'react';
import {
  formatJalaliDateLong,
  jalaliToGregorian,
  jalaliYearOptions,
  toJalaliParts,
} from '../../../shared/jalali';
import { jalaaliMonthLength } from 'jalaali-js';

const MONTHS = [
  { v: 1, l: 'فروردین' }, { v: 2, l: 'اردیبهشت' }, { v: 3, l: 'خرداد' },
  { v: 4, l: 'تیر' }, { v: 5, l: 'مرداد' }, { v: 6, l: 'شهریور' },
  { v: 7, l: 'مهر' }, { v: 8, l: 'آبان' }, { v: 9, l: 'آذر' },
  { v: 10, l: 'دی' }, { v: 11, l: 'بهمن' }, { v: 12, l: 'اسفند' },
];

export default function JalaliDateInput({ value, onChange, className = '' }) {
  const init = value ? toJalaliParts(value + 'T12:00:00') : null;
  const [jy, setJy] = useState(init?.year || '');
  const [jm, setJm] = useState(init?.month || '');
  const [jd, setJd] = useState(init?.day || '');

  useEffect(() => {
    if (!value) {
      setJy('');
      setJm('');
      setJd('');
      return;
    }
    const p = toJalaliParts(value + 'T12:00:00');
    if (p) {
      setJy(p.year);
      setJm(p.month);
      setJd(p.day);
    }
  }, [value]);

  const emit = (y, m, d) => {
    if (y && m && d) onChange(jalaliToGregorian(y, m, d));
    else onChange('');
  };

  const daysInMonth = jy && jm ? jalaaliMonthLength(jy, jm) : 31;
  const selectCls = 'border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-sm';

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <select
          value={jy}
          onChange={(e) => { const y = +e.target.value; setJy(y); emit(y, jm, jd); }}
          className={`${selectCls} min-w-[5.5rem]`}
        >
          <option value="">سال</option>
          {jalaliYearOptions(6).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          value={jm}
          onChange={(e) => { const m = +e.target.value; setJm(m); emit(jy, m, jd); }}
          className={`${selectCls} flex-1 min-w-[6rem]`}
        >
          <option value="">ماه</option>
          {MONTHS.map((m) => (
            <option key={m.v} value={m.v}>{m.l}</option>
          ))}
        </select>
        <select
          value={jd}
          onChange={(e) => { const d = +e.target.value; setJd(d); emit(jy, jm, d); }}
          className={`${selectCls} min-w-[4.5rem]`}
        >
          <option value="">روز</option>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs text-slate-500 px-2 hover:text-pink-700"
          >
            پاک
          </button>
        )}
      </div>
      {value && (
        <p className="text-xs text-slate-500 mt-1.5">{formatJalaliDateLong(value + 'T12:00:00')}</p>
      )}
    </div>
  );
}
