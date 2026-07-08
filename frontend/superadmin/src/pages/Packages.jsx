import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check } from 'lucide-react';
import { api, formatPrice } from '../api';
import { useToast } from '../context/Toast';
import Modal from '../components/Modal';

const field = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-sm';
const emptyForm = { name: '', description: '', price_monthly: 0, price_yearly: 0, is_active: 1, feature_ids: [] };

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [features, setFeatures] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const { show } = useToast();

  const load = () => {
    api('/packages').then(setPackages).catch((e) => show(e.message, 'error'));
    api('/features').then(setFeatures).catch(() => {});
  };
  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description || '',
      price_monthly: p.price_monthly, price_yearly: p.price_yearly,
      is_active: p.is_active, feature_ids: p.feature_ids || [],
    });
    setOpen(true);
  };

  const toggleFeature = (id) => {
    setForm((f) => ({
      ...f,
      feature_ids: f.feature_ids.includes(id) ? f.feature_ids.filter((x) => x !== id) : [...f.feature_ids, id],
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name, description: form.description,
        price_monthly: Number(form.price_monthly), price_yearly: Number(form.price_yearly),
        is_active: form.is_active ? 1 : 0, feature_ids: form.feature_ids,
      };
      if (editing) await api(`/packages/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      else await api('/packages', { method: 'POST', body: JSON.stringify(payload) });
      show('پکیج ذخیره شد');
      setOpen(false);
      load();
    } catch (err) {
      show(err.message, 'error');
    }
  };

  const remove = async (p) => {
    if (!confirm(`حذف پکیج «${p.name}»؟`)) return;
    try { await api(`/packages/${p.id}`, { method: 'DELETE' }); show('حذف شد'); load(); }
    catch (err) { show(err.message, 'error'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800">پکیج‌های اشتراک</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold">
          <Plus size={18} /> پکیج جدید
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl shadow-sm p-5 flex flex-col">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-lg text-slate-800">{p.name}</div>
                <div className="text-xs text-slate-400">{p.sites_count} سایت</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(p)} className="p-2 rounded-lg text-slate-400 hover:bg-sky-50 hover:text-sky-600"><Pencil size={15} /></button>
                <button onClick={() => remove(p)} className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
              </div>
            </div>
            {p.description && <p className="text-sm text-slate-500 mt-2">{p.description}</p>}
            <div className="mt-3 space-y-1">
              <div className="text-sm text-slate-600">ماهانه: <b>{formatPrice(p.price_monthly)}</b></div>
              <div className="text-sm text-slate-600">سالانه: <b>{formatPrice(p.price_yearly)}</b></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {features.filter((f) => (p.feature_ids || []).includes(f.id)).map((f) => (
                <span key={f.id} className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs">{f.name}</span>
              ))}
            </div>
          </div>
        ))}
        {packages.length === 0 && <div className="text-slate-400 col-span-full text-center py-10">هنوز پکیجی ساخته نشده است</div>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'ویرایش پکیج' : 'پکیج جدید'} wide>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">نام پکیج</label>
              <input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">توضیح</label>
              <input className={field} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">قیمت ماهانه (تومان)</label>
              <input className={field} dir="ltr" type="number" value={form.price_monthly} onChange={(e) => setForm({ ...form, price_monthly: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">قیمت سالانه (تومان)</label>
              <input className={field} dir="ltr" type="number" value={form.price_yearly} onChange={(e) => setForm({ ...form, price_yearly: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-2">قابلیت‌های فعال در این پکیج</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {features.map((f) => {
                const on = form.feature_ids.includes(f.id);
                return (
                  <button
                    type="button"
                    key={f.id}
                    onClick={() => toggleFeature(f.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm text-right transition ${on ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'}`}
                  >
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center ${on ? 'bg-brand-600 text-white' : 'bg-slate-100'}`}>
                      {on && <Check size={14} />}
                    </span>
                    <span className="flex-1">
                      <span className="font-medium">{f.name}</span>
                      {f.description && <span className="block text-xs text-slate-400">{f.description}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })} />
            پکیج فعال است
          </label>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">انصراف</button>
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold">ذخیره</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
