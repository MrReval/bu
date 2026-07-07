import { toJalaali, toGregorian, jalaaliMonthLength } from 'jalaali-js';

const MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];

export function toPersianDigits(str) {
  return String(str).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

export function parseDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toJalaliParts(date) {
  const d = parseDate(date);
  if (!d) return null;
  const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return {
    year: j.jy,
    month: j.jm,
    day: j.jd,
    weekday: WEEKDAYS[d.getDay()],
    monthName: MONTHS[j.jm - 1],
  };
}

/** ۱۴۰۴/۰۳/۰۵ */
export function formatJalaliDate(value, options = {}) {
  const p = toJalaliParts(value);
  if (!p) return '—';
  const { showWeekday = false } = options;
  const dateStr = toPersianDigits(`${p.year}/${String(p.month).padStart(2, '0')}/${String(p.day).padStart(2, '0')}`);
  if (showWeekday) return `${p.weekday} ${dateStr}`;
  return dateStr;
}

/** دوشنبه ۵ خرداد ۱۴۰۴ */
export function formatJalaliDateLong(value) {
  const p = toJalaliParts(value);
  if (!p) return '—';
  return toPersianDigits(`${p.weekday} ${p.day} ${p.monthName} ${p.year}`);
}

/** ۵ خرداد ۱۴۰۴، ۱۴:۳۰ */
export function formatJalaliDateTime(value) {
  const d = parseDate(value);
  if (!d) return '—';
  const p = toJalaliParts(d);
  const time = d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false });
  return toPersianDigits(`${p.day} ${p.monthName} ${p.year}، ${time}`);
}

/** فقط ساعت */
export function formatJalaliTime(value) {
  const d = parseDate(value);
  if (!d) return '—';
  return toPersianDigits(d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false }));
}

/** امروز به میلادی YYYY-MM-DD برای API */
export function todayGregorian() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/** تبدیل جلالی به میلادی YYYY-MM-DD */
export function jalaliToGregorian(year, month, day) {
  const g = toGregorian(+year, +month, +day);
  const mm = String(g.gm).padStart(2, '0');
  const dd = String(g.gd).padStart(2, '0');
  return `${g.gy}-${mm}-${dd}`;
}

/** گزینه‌های سال جلالی برای سلکت */
export function jalaliYearOptions(range = 2) {
  const current = toJalaali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()).jy;
  const years = [];
  for (let y = current - 1; y <= current + range; y++) years.push(y);
  return years;
}
