import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Pencil,
  User,
  Mail,
  Lock,
  Palette,
  BadgeCheck,
  Scissors,
  Percent,
} from 'lucide-react';
import ImageUpload from './ImageUpload';
import PortfolioUpload from './PortfolioUpload';
import { getUser } from '../../../shared/api';

const inputClass =
  'w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400';

function initialFromName(name) {
  const v = (name || '').trim();
  return v ? v.charAt(0) : 'پ';
}

export default function StaffFormDrawer({
  open,
  onClose,
  form,
  setForm,
  editId,
  services,
  onSubmit,
  saving,
  onAvatarUploaded,
}) {
  const isManager = ['super_admin', 'manager'].includes(getUser()?.role);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const selectedSet = useMemo(() => new Set((form.service_ids || []).map(Number)), [form.service_ids]);
  const hasService = (id) => selectedSet.has(Number(id));
  const toggleService = (id) => {
    const nid = Number(id);
    const exists = hasService(nid);
    setForm((f) => ({
      ...f,
      service_ids: exists ? f.service_ids.filter((x) => Number(x) !== nid) : [...f.service_ids, nid],
    }));
  };

  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="بستن"
      />

      <aside
        className="absolute inset-y-0 left-0 w-full max-w-md bg-white shadow-2xl flex flex-col drawer-slide-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-drawer-title"
      >
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm"
              style={{ backgroundColor: form.color_hex || '#be185d' }}
              aria-hidden
            >
              <span className="font-bold">{initialFromName(form.display_name)}</span>
            </div>
            <div className="min-w-0">
              <h2 id="staff-drawer-title" className="font-bold text-slate-900 truncate">
                {editId
                  ? isManager
                    ? 'ویرایش پرسنل'
                    : 'پروفایل من'
                  : 'افزودن پرسنل جدید'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {editId ? 'تغییرات را ذخیره کنید' : 'اطلاعات پرسنل را وارد کنید'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
            aria-label="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                نام نمایشی *
              </label>
              <input
                required
                autoFocus
                placeholder="مثلاً خانم رضایی"
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                className={inputClass}
              />
            </div>

            {editId && (
              <ImageUpload
                label="عکس پروفایل"
                value={form.avatar_path}
                previewUrl={form.avatar_url}
                uploadPath={`/admin/staff/${editId}/avatar`}
                onChange={(data) => {
                  setForm((f) => ({ ...f, avatar_path: data.avatar_path, avatar_url: data.url }));
                  onAvatarUploaded?.(data);
                }}
              />
            )}

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">بیوگرافی</label>
              <textarea
                placeholder="مثلاً متخصص رنگ و مش (اختیاری)"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className={`${inputClass} resize-none`}
                rows={3}
              />
            </div>

            {!editId && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-pink-600" />
                  حساب کاربری
                </p>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      ایمیل ورود *
                    </label>
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" />
                      رمز عبور *
                    </label>
                    <input
                      type="password"
                      placeholder="حداقل 6 کاراکتر"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className={inputClass}
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              </div>
            )}

            {isManager && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5" />
                  رنگ تقویم
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.color_hex}
                    onChange={(e) => setForm({ ...form, color_hex: e.target.value })}
                    className="h-10 w-10 rounded-full cursor-pointer border-0 bg-transparent p-0 shadow-sm ring-2 ring-slate-200 hover:ring-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                  <div className="text-xs text-slate-500">
                    <div className="font-medium text-slate-700">{form.color_hex}</div>
                    <div>برای نمایش در تقویم</div>
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_accepting_bookings == 1}
                  onChange={(e) => setForm({ ...form, is_accepting_bookings: e.target.checked ? 1 : 0 })}
                  className="w-5 h-5 accent-pink-600 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-slate-800 block">پذیرش نوبت</span>
                  <span className="text-xs text-slate-500">در مرحله انتخاب پرسنل نمایش داده می‌شود</span>
                </div>
              </label>
            </div>
            )}

            {isManager && editId && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5" />
                  درصد رضایت مشتریان
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={inputClass}
                  value={form.satisfaction_percent ?? 98}
                  onChange={(e) =>
                    setForm({ ...form, satisfaction_percent: Math.min(100, Math.max(0, Number(e.target.value))) })
                  }
                />
              </div>
            )}

            {editId && (
              <div className="rounded-2xl border border-slate-200 p-4">
                <PortfolioUpload staffId={editId} />
              </div>
            )}

            {isManager && (
            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <Scissors className="w-3.5 h-3.5" />
                  خدمات قابل ارائه
                </p>
                <span className="text-xs text-slate-400">{(form.service_ids || []).length} انتخاب</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {services.map((s) => {
                  const active = hasService(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleService(s.id)}
                      className={`px-3 py-2 rounded-xl text-sm border transition ${
                        active
                          ? 'border-pink-500 bg-pink-50 text-pink-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-pink-200'
                      }`}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
            )}
          </div>

          <div className="shrink-0 px-6 py-4 border-t border-slate-200 bg-slate-50 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-white transition"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-pink-600 text-white font-semibold hover:bg-pink-700 disabled:opacity-60 transition shadow-sm"
            >
              {saving ? 'در حال ذخیره...' : editId ? 'ذخیره تغییرات' : 'افزودن پرسنل'}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
}

