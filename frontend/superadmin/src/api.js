const API = '/api/v1/super';

export function getToken() {
  return localStorage.getItem('super_token');
}

export function setAuth(data) {
  localStorage.setItem('super_token', data.token);
  localStorage.setItem('super_admin', JSON.stringify(data.admin));
}

export function clearAuth() {
  localStorage.removeItem('super_token');
  localStorage.removeItem('super_admin');
}

export function getAdmin() {
  try {
    return JSON.parse(localStorage.getItem('super_admin') || 'null');
  } catch {
    return null;
  }
}

export function isSuperAdmin() {
  const a = getAdmin();
  return !a || a.role !== 'employee';
}

export function homePathForRole() {
  return isSuperAdmin() ? '/' : '/leads';
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
    throw new Error('پاسخ نامعتبر از سرور');
  }
  if (!res.ok) {
    if (res.status === 401) {
      clearAuth();
      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }
    throw new Error(data?.error || 'خطا در ارتباط با سرور');
  }
  return data;
}

export function formatPrice(n) {
  return new Intl.NumberFormat('fa-IR').format(n || 0) + ' تومان';
}

export function formatDate(d) {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(d));
  } catch {
    return d;
  }
}
