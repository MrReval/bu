import { useEffect, useState } from 'react';
import { Save, User } from 'lucide-react';
import { api } from '../../../shared/api';
import { useToast } from '../context/Toast';
import ImageUpload from './ImageUpload';
import PortfolioUpload from './PortfolioUpload';

const inputClass =
  'w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400';

export default function StaffMyProfile({ staff, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    display_name: '',
    bio: '',
    avatar_path: '',
    avatar_url: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!staff) return;
    setForm({
      display_name: staff.display_name || '',
      bio: staff.bio || '',
      avatar_path: staff.avatar_path || '',
      avatar_url: staff.avatar_url || '',
    });
  }, [staff]);

  const save = async (e) => {
    e.preventDefault();
    if (!staff?.id) return;
    setSaving(true);
    try {
      await api(`/admin/staff/${staff.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          display_name: form.display_name,
          bio: form.bio,
          color_hex: staff.color_hex || '#be185d',
          is_accepting_bookings: staff.is_accepting_bookings,
        }),
      });
      toast.show('پروفایل ذخیره شد');
      onSaved?.();
    } catch (err) {
      toast.show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!staff) return null;

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 space-y-6">
        <div>
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-pink-600" />
            اطلاعات پروفایل
          </h2>
          <p className="text-sm text-slate-500 mt-1">این اطلاعات در صفحه عمومی شما در وب‌سایت نمایش داده می‌شود.</p>
        </div>

        <ImageUpload
          label="عکس پروفایل"
          value={form.avatar_path}
          previewUrl={form.avatar_url}
          uploadPath={`/admin/staff/${staff.id}/avatar`}
          onChange={(data) => {
            setForm((f) => ({ ...f, avatar_path: data.avatar_path, avatar_url: data.url }));
            onSaved?.();
          }}
        />

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-2">نام نمایشی *</label>
          <input
            required
            placeholder="مثلاً خانم رضایی"
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-2">بیوگرافی</label>
          <textarea
            placeholder="درباره تخصص و تجربه خود بنویسید..."
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className={`${inputClass} resize-y min-h-[100px]`}
            rows={4}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-60 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-sm"
        >
          <Save className="w-4 h-4" />
          {saving ? 'در حال ذخیره...' : 'ذخیره اطلاعات'}
        </button>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="mb-4">
          <h2 className="font-bold text-slate-900">نمونه کارها</h2>
          <p className="text-sm text-slate-500 mt-1">
            تصاویر کارهای خود را آپلود کنید و برای هر کدام توضیحات چندخطی بنویسید.
          </p>
        </div>
        <PortfolioUpload staffId={staff.id} multilineCaption />
      </div>
    </form>
  );
}
