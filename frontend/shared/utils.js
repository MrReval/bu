import {
  formatJalaliDate,
  formatJalaliDateLong,
  formatJalaliDateTime,
  formatJalaliTime,
  todayGregorian,
  toPersianDigits,
} from './jalali.js';

export {
  formatJalaliDate,
  formatJalaliDateLong,
  formatJalaliDateTime,
  formatJalaliTime,
  todayGregorian,
  toPersianDigits,
};

export const formatDateLong = formatJalaliDateLong;
export const formatDateTime = formatJalaliDateTime;

export function parseJson(val, fallback = {}) {
  if (val == null || val === '') return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export const DAY_NAMES = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];

const DEFAULT_OPEN = '09:00';
const DEFAULT_CLOSE = '21:00';

/** @param {Record<string, unknown>|null|undefined} day */
export function isBusinessDayClosed(day) {
  if (!day || typeof day !== 'object') return true;
  return Boolean(day.closed);
}

/** @param {Record<string, unknown>|null|undefined} day */
export function getBusinessDayHours(day) {
  if (isBusinessDayClosed(day)) {
    return { closed: true, open: '', close: '', label: 'تعطیل' };
  }
  const open = String(day.open || DEFAULT_OPEN);
  const close = String(day.close || DEFAULT_CLOSE);
  return { closed: false, open, close, label: `${open} – ${close}` };
}

/** @param {Record<string, Record<string, unknown>>|null|undefined} hours */
export function normalizeBusinessHours(hours) {
  if (!hours || typeof hours !== 'object') return {};
  const out = { ...hours };
  for (const key of Object.keys(out)) {
    const day = out[key];
    if (!day || typeof day !== 'object') continue;
    if (isBusinessDayClosed(day)) {
      out[key] = { ...day, closed: true, open: '', close: '' };
      continue;
    }
    out[key] = {
      ...day,
      closed: false,
      open: day.open || DEFAULT_OPEN,
      close: day.close || DEFAULT_CLOSE,
    };
  }
  return out;
}

export const STATUS_LABELS = {
  pending: 'در انتظار',
  confirmed: 'تأیید شده',
  in_progress: 'در حال انجام',
  completed: 'انجام شده',
  cancelled: 'لغو شده',
  no_show: 'عدم حضور',
};

export const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-slate-100 text-slate-700 border-slate-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  no_show: 'bg-gray-100 text-gray-600 border-gray-200',
};

export const STATUS_DOT = {
  pending: 'bg-amber-500',
  confirmed: 'bg-emerald-500',
  in_progress: 'bg-blue-500',
  completed: 'bg-slate-400',
  cancelled: 'bg-red-500',
  no_show: 'bg-gray-400',
};

// Replace common Gregorian datetime strings in text with Jalali formatted text.
// Example: "2026-05-27 13:30:00" -> "۶ خرداد ۱۴۰۵، ۱۳:۳۰"
export function replaceGregorianDatesWithJalali(text) {
  if (!text) return text;
  const str = String(text);
  const re = /\b(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2})(?::\d{2})?)?\b/g;
  return str.replace(re, (_m, ymd, hm) => {
    const iso = hm ? `${ymd}T${hm}:00` : `${ymd}T12:00:00`;
    return formatJalaliDateTime(iso);
  });
}
