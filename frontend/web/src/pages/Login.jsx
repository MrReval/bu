import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Phone, User, UserPlus } from 'lucide-react';
import { api, setAuth } from '../../../shared/api';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ login: '', password: '', name: '', phone: '', email: '' });
  const [error, setError] = useState('');
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') {
        const data = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ login: form.login, password: form.password }),
        });
        setAuth(data);
      } else {
        const data = await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: form.name,
            phone: form.phone,
            email: form.email || null,
            password: form.password,
          }),
        });
        setAuth(data);
      }
      nav('/my-appointments');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-14">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-pink-600 text-white shadow-lg mb-4">
            {mode === 'login' ? <User className="w-7 h-7" /> : <UserPlus className="w-7 h-7" />}
          </div>
          <h1 className="text-2xl font-bold text-stone-900">
            {mode === 'login' ? 'ورود مشتری' : 'ثبت‌نام مشتری'}
          </h1>
          <p className="text-stone-500 text-sm mt-2">
            {mode === 'login' ? 'برای دیدن نوبت‌ها و مدیریت رزرو وارد شوید' : 'حساب بسازید و راحت‌تر نوبت بگیرید'}
          </p>
        </div>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm">{error}</div>}

        <form onSubmit={submit} className="space-y-4 bg-white p-6 sm:p-7 rounded-3xl shadow-xl border border-stone-200">
        {mode === 'register' && (
            <label className="block">
              <span className="text-xs font-semibold text-stone-500">نام</span>
              <div className="mt-2 relative">
                <User className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  placeholder="مثلاً سارا"
                  required
                  className="w-full border border-stone-200 rounded-2xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </label>
        )}

          <label className="block">
            <span className="text-xs font-semibold text-stone-500">
              {mode === 'login' ? 'موبایل یا ایمیل' : 'موبایل'}
            </span>
            <div className="mt-2 relative">
              <Phone className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                placeholder={mode === 'login' ? 'مثلاً 0912...' : 'شماره موبایل'}
                required
                className="w-full border border-stone-200 rounded-2xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400"
                value={mode === 'login' ? form.login : form.phone}
                onChange={(e) =>
                  setForm(mode === 'login' ? { ...form, login: e.target.value } : { ...form, phone: e.target.value })
                }
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-stone-500">رمز عبور</span>
            <div className="mt-2 relative">
              <Lock className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="حداقل ۶ کاراکتر"
                required
                minLength={6}
                className="w-full border border-stone-200 rounded-2xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </label>

          <button
            type="submit"
            className="w-full bg-pink-600 hover:bg-pink-700 text-white py-3.5 rounded-2xl font-bold shadow-md hover:shadow-lg transition"
          >
            {mode === 'login' ? 'ورود' : 'ثبت‌نام'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            className="text-pink-700 text-sm font-semibold hover:underline"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'حساب ندارید؟ ثبت‌نام' : 'حساب دارید؟ ورود'}
          </button>
          <Link to="/" className="block mt-3 text-stone-500 text-sm hover:text-stone-700">
            بازگشت به سایت
          </Link>
        </div>
      </div>
    </div>
  );
}
