const API = '/api/v1';

export function getToken() {
  return localStorage.getItem('salon_token');
}

export function setAuth(data) {
  localStorage.setItem('salon_token', data.token);
  localStorage.setItem('salon_user', JSON.stringify(data.user));
}

export function clearAuth() {
  localStorage.removeItem('salon_token');
  localStorage.removeItem('salon_user');
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('salon_user') || 'null');
  } catch {
    return null;
  }
}

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  let data;
  try {
    data = await res.json();
  } catch {
    // اگر پاسخ JSON نبود (مثلاً HTML خطا/پروکسی)، باید خطا بدهیم تا UI به object خالی تبدیل نشود
    throw new Error('پاسخ نامعتبر از سرور دریافت شد');
  }
  if (!res.ok) throw new Error(data?.error || 'خطا در ارتباط با سرور');
  return data;
}

/** آپلود فایل (multipart) — بدون Content-Type دستی */
export async function uploadApi(path, formData, method = 'POST') {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method, headers, body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'خطا در آپلود');
  return data;
}

export function mediaUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return path.startsWith('/') ? path : `/${path}`;
}

export function formatPrice(n) {
  return new Intl.NumberFormat('fa-IR').format(n) + ' تومان';
}

export {
  formatDateTime,
  formatDateLong,
  formatJalaliDate,
  formatJalaliDateLong,
  formatJalaliDateTime,
  formatJalaliTime,
} from './utils.js';
