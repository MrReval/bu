import { useEffect, useState } from 'react';
import { api } from '../../../shared/api';
import { useVertical } from '../context/Vertical';
import { formatJalaliDate } from '../../../shared/utils';
import { Pencil, X } from 'lucide-react';

export default function Customers() {
  const { labels, verticalFeatures } = useVertical();
  const showNationalId = !!verticalFeatures.customer_national_id;
  const [list, setList] = useState([]);
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => api('/admin/customers').then(setList).catch(() => setList([]));

  useEffect(() => {
    load();
  }, []);

  const openEdit = (c) => {
    setError('');
    setEdit({
      id: c.id,
      name: c.name || '',
      email: c.email || '',
      notes: c.notes || '',
      birth_date: c.birth_date || '',
      national_id: c.national_id || '',
    });
  };

  const save = async () => {
    if (!edit?.id) return;
    setSaving(true);
    setError('');
    try {
      await api(`/admin/customers/${edit.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: edit.name,
          email: edit.email,
          notes: edit.notes,
          birth_date: edit.birth_date,
          national_id: edit.national_id,
        }),
      });
      setEdit(null);
      await load();
    } catch (e) {
      setError(e.message || 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{labels.customer}ان</h1>
      <p className="text-slate-500 text-sm mb-6">فهرست و پرونده سبک {labels.customer}</p>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-right">نام</th>
              <th className="p-3 text-right">موبایل</th>
              {showNationalId && <th className="p-3 text-right hidden sm:table-cell">کد ملی</th>}
              <th className="p-3 text-right hidden md:table-cell">یادداشت</th>
              <th className="p-3 text-right hidden lg:table-cell">عضویت</th>
              <th className="p-3 text-right w-12" />
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={showNationalId ? 6 : 5} className="p-8 text-center text-slate-400">
                  هنوز {labels.customer}ی ثبت نشده
                </td>
              </tr>
            ) : (
              list.map((c) => (
                <tr key={c.id} className="border-t hover:bg-slate-50/80">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3" dir="ltr">{c.phone}</td>
                  {showNationalId && (
                    <td className="p-3 hidden sm:table-cell" dir="ltr">{c.national_id || '—'}</td>
                  )}
                  <td className="p-3 hidden md:table-cell text-slate-500 max-w-[12rem] truncate">
                    {c.notes || '—'}
                  </td>
                  <td className="p-3 hidden lg:table-cell text-slate-400 text-xs">
                    {c.created_at ? formatJalaliDate(c.created_at) : '—'}
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="p-2 rounded-lg text-slate-500 hover:bg-pink-50 hover:text-pink-700"
                      aria-label="ویرایش"
                    >
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">ویرایش {labels.customer}</h2>
              <button type="button" onClick={() => setEdit(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <label className="block text-sm">
              <span className="text-slate-500 text-xs">نام</span>
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-500 text-xs">ایمیل</span>
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2"
                dir="ltr"
                value={edit.email}
                onChange={(e) => setEdit({ ...edit, email: e.target.value })}
              />
            </label>
            {showNationalId && (
              <label className="block text-sm">
                <span className="text-slate-500 text-xs">کد ملی</span>
                <input
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  dir="ltr"
                  maxLength={10}
                  value={edit.national_id}
                  onChange={(e) => setEdit({ ...edit, national_id: e.target.value.replace(/\D/g, '') })}
                />
              </label>
            )}
            <label className="block text-sm">
              <span className="text-slate-500 text-xs">تاریخ تولد</span>
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2"
                placeholder="مثلاً ۱۳۷۰/۰۱/۱۵"
                value={edit.birth_date}
                onChange={(e) => setEdit({ ...edit, birth_date: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-500 text-xs">یادداشت داخلی</span>
              <textarea
                className="mt-1 w-full border rounded-xl px-3 py-2"
                rows={3}
                value={edit.notes}
                onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="flex-1 py-2.5 rounded-xl bg-pink-600 text-white font-semibold disabled:opacity-50"
              >
                {saving ? 'در حال ذخیره...' : 'ذخیره'}
              </button>
              <button type="button" onClick={() => setEdit(null)} className="px-4 py-2.5 rounded-xl border text-slate-600">
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
