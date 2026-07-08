import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Pencil, Clock, Banknote, Tag } from 'lucide-react';

const inputClass =
  'w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400';

export default function ServiceFormDrawer({
  open,
  onClose,
  form,
  setForm,
  editId,
  categories,
  onSubmit,
  saving,
}) {
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
        aria-labelledby="service-drawer-title"
      >
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
              {editId ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h2 id="service-drawer-title" className="font-bold text-slate-900 truncate">
                {editId ? 'ویرایش خدمت' : 'افزودن خدمت جدید'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {editId ? 'تغییرات را ذخیره کنید' : 'اطلاعات خدمت را وارد کنید'}
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
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">نام خدمت *</label>
              <input
                required
                autoFocus
                placeholder="مثلاً مانیکور ژلی"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                دسته‌بندی
              </label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className={inputClass}
              >
                <option value="">بدون دسته</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  مدت (دقیقه)
                </label>
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5" />
                  قیمت (تومان)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5" />
                درصد بیعانه (٪) — برای دریافت بیعانه این خدمت
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={form.deposit_percent ?? 0}
                onChange={(e) => setForm({ ...form, deposit_percent: e.target.value })}
                className={inputClass}
                placeholder="۰ = استفاده از درصد پیش‌فرض سالن"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">توضیحات</label>
              <textarea
                placeholder="توضیح کوتاه برای نمایش در سایت (اختیاری)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={`${inputClass} resize-none`}
                rows={3}
              />
            </div>

            <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active == 1}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })}
                className="w-5 h-5 accent-pink-600 rounded"
              />
              <div>
                <span className="text-sm font-medium text-slate-800 block">فعال در سایت</span>
                <span className="text-xs text-slate-500">در لندینگ و رزرو آنلاین نمایش داده می‌شود</span>
              </div>
            </label>
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
              {saving ? 'در حال ذخیره...' : editId ? 'ذخیره تغییرات' : 'افزودن خدمت'}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );

  // رندر داخل body برای جلوگیری از offset/padding والدها
  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
}
