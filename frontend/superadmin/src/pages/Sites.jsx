import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, KeyRound, ExternalLink } from 'lucide-react';
import { api, formatDate } from '../api';
import { useToast } from '../context/Toast';
import Modal from '../components/Modal';

const field = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-sm';

const emptyForm = {
  name: '', domain: '', admin_name: 'مدیر', admin_email: '', admin_password: '',
  package_id: '', expires_at: '', period: 'monthly', status: 'active',
};

export default function Sites() {
  const [sites, setSites] = useState([]);
  const [packages, setPackages] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [pwModal, setPwModal] = useState(null);
  const [newPw, setNewPw] = useState('');
  const { show } = useToast();

  const load = () => {
    api('/sites').then(setSites).catch((e) => show(e.message, 'error'));
    api('/packages').then(setPackages).catch(() => {});
  };
  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      ...emptyForm,
      name: s.name, domain: s.domain, status: s.status,
      package_id: s.package_id || '', expires_at: (s.expires_at || '').slice(0, 10),
    });
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name, domain: form.domain, status: form.status,
        package_id: form.package_id || null, period: form.period,
        expires_at: form.expires_at || null,
      };
      if (editing) {
        await api(`/sites/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        show('سایت ویرایش شد');
      } else {
        await api('/sites', {
          method: 'POST',
          body: JSON.stringify({
            ...payload,
            admin_name: form.admin_name,
            admin_email: form.admin_email,
            admin_password: form.admin_password,
          }),
        });
        show('سایت جدید ساخته شد');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      show(err.message, 'error');
    }
  };

  const remove = async (s) => {
    if (!confirm(`حذف سایت «${s.name}»؟ همه داده‌های آن پاک می‌شود.`)) return;
    try {
      await api(`/sites/${s.id}`, { method: 'DELETE' });
      show('سایت حذف شد');
      load();
    } catch (err) {
      show(err.message, 'error');
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    try {
      await api(`/sites/${pwModal.id}/reset-password`, { method: 'POST', body: JSON.stringify({ password: newPw }) });
      show('رمز مدیر تغییر کرد');
      setPwModal(null);
      setNewPw('');
    } catch (err) {
      show(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800">وب‌سایت‌ها</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold">
          <Plus size={18} /> سایت جدید
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-right px-5 py-3 font-medium">نام</th>
              <th className="text-right px-5 py-3 font-medium">دامنه</th>
              <th className="text-right px-5 py-3 font-medium">پکیج</th>
              <th className="text-right px-5 py-3 font-medium">مشتریان</th>
              <th className="text-right px-5 py-3 font-medium">انقضا</th>
              <th className="text-right px-5 py-3 font-medium">وضعیت</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {sites.map((s) => (
              <tr key={s.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                <td className="px-5 py-3 font-medium text-slate-700">
                  {s.name}
                  <div className="text-xs text-slate-400">{s.admin_email}</div>
                </td>
                <td className="px-5 py-3 text-slate-500" dir="ltr">
                  <a href={`https://${s.domain}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-brand-600">
                    {s.domain} <ExternalLink size={13} />
                  </a>
                </td>
                <td className="px-5 py-3 text-slate-500">{s.package_name || '—'}</td>
                <td className="px-5 py-3 text-slate-500">{new Intl.NumberFormat('fa-IR').format(s.customers_count || 0)}</td>
                <td className="px-5 py-3 text-slate-500">{formatDate(s.expires_at)}</td>
                <td className="px-5 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {s.status === 'active' ? 'فعال' : 'غیرفعال'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => setPwModal(s)} title="تغییر رمز مدیر" className="p-2 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600">
                      <KeyRound size={16} />
                    </button>
                    <button onClick={() => openEdit(s)} className="p-2 rounded-lg text-slate-400 hover:bg-sky-50 hover:text-sky-600">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => remove(s)} className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sites.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400">هنوز سایتی ثبت نشده است</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'ویرایش سایت' : 'ساخت سایت جدید'} wide>
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">نام سالن</label>
            <input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">دامنه</label>
            <input className={field} dir="ltr" placeholder="example.com" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} required />
          </div>

          {!editing && (
            <>
              <div>
                <label className="block text-sm text-slate-600 mb-1">نام مدیر</label>
                <input className={field} value={form.admin_name} onChange={(e) => setForm({ ...form, admin_name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">ایمیل مدیر</label>
                <input className={field} dir="ltr" type="email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">رمز مدیر</label>
                <input className={field} dir="ltr" value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} required />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm text-slate-600 mb-1">پکیج اشتراک</label>
            <select className={field} value={form.package_id} onChange={(e) => setForm({ ...form, package_id: e.target.value })}>
              <option value="">بدون پکیج (همه امکانات)</option>
              {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">دوره</label>
            <select className={field} value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
              <option value="monthly">ماهانه</option>
              <option value="yearly">سالانه</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">تاریخ انقضا</label>
            <input className={field} dir="ltr" type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          </div>
          {editing && (
            <div>
              <label className="block text-sm text-slate-600 mb-1">وضعیت</label>
              <select className={field} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">فعال</option>
                <option value="suspended">غیرفعال</option>
              </select>
            </div>
          )}

          <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">انصراف</button>
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold">ذخیره</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!pwModal} onClose={() => setPwModal(null)} title={`تغییر رمز مدیر ${pwModal?.name || ''}`}>
        <form onSubmit={resetPassword}>
          <label className="block text-sm text-slate-600 mb-1">رمز جدید</label>
          <input className={field} dir="ltr" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={6} />
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={() => setPwModal(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm">انصراف</button>
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold">تغییر رمز</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
