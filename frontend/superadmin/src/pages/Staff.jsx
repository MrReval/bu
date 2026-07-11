import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users, ShieldCheck, UserRound } from 'lucide-react';
import { api, formatDate, getAdmin } from '../api';
import { useToast } from '../context/Toast';
import Modal from '../components/Modal';

const field = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-sm';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'employee',
  is_active: 1,
};

const roleLabel = {
  super_admin: 'سوپرادمین',
  employee: 'کارمند (سرنخ‌ها)',
};

export default function Staff() {
  const { show } = useToast();
  const me = getAdmin();
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    api('/staff').then(setUsers).catch((e) => show(e.message, 'error'));
  };
  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role || 'employee',
      is_active: u.is_active ? 1 : 0,
    });
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const payload = {
          name: form.name,
          email: form.email,
          role: form.role,
          is_active: form.is_active ? 1 : 0,
        };
        if (form.password.trim()) payload.password = form.password;
        await api(`/staff/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        show('اکانت به‌روزرسانی شد');
      } else {
        await api('/staff', {
          method: 'POST',
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role,
          }),
        });
        show('اکانت ایجاد شد');
      }
      setOpen(false);
      load();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (u) => {
    if (!confirm(`حذف اکانت «${u.name}»؟`)) return;
    try {
      await api(`/staff/${u.id}`, { method: 'DELETE' });
      show('اکانت حذف شد');
      load();
    } catch (err) {
      show(err.message, 'error');
    }
  };

  const toggleActive = async (u) => {
    try {
      await api(`/staff/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: u.is_active ? 0 : 1 }),
      });
      show(u.is_active ? 'اکانت غیرفعال شد' : 'اکانت فعال شد');
      load();
    } catch (err) {
      show(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Users className="text-brand-600" />
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">مدیریت اکانت‌ها</h1>
            <p className="text-sm text-slate-500 mt-0.5">ایجاد دسترسی کارمند برای ورود به سوپرادمین و مدیریت سرنخ‌ها</p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
        >
          <Plus size={18} />
          اکانت جدید
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="text-right px-4 py-3 font-medium">نام</th>
                <th className="text-right px-4 py-3 font-medium">ایمیل</th>
                <th className="text-right px-4 py-3 font-medium">نقش</th>
                <th className="text-right px-4 py-3 font-medium">وضعیت</th>
                <th className="text-right px-4 py-3 font-medium">آخرین ورود</th>
                <th className="text-right px-4 py-3 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">هنوز اکانتی ثبت نشده</td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${u.role === 'super_admin' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'}`}>
                        {u.role === 'super_admin' ? <ShieldCheck size={15} /> : <UserRound size={15} />}
                      </div>
                      <span className="font-semibold text-slate-800">
                        {u.name}
                        {me?.id === u.id && <span className="text-xs text-slate-400 font-normal mr-1">(شما)</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600" dir="ltr">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      u.role === 'super_admin' ? 'bg-brand-50 text-brand-700' : 'bg-sky-50 text-sky-700'
                    }`}>
                      {roleLabel[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(u)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {u.is_active ? 'فعال' : 'غیرفعال'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(u.last_login_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => openEdit(u)} className="p-2 rounded-lg text-slate-400 hover:bg-sky-50 hover:text-sky-600" title="ویرایش">
                        <Pencil size={16} />
                      </button>
                      {me?.id !== u.id && (
                        <button type="button" onClick={() => remove(u)} className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="حذف">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'ویرایش اکانت' : 'اکانت جدید'}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">نام *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={field} placeholder="نام کارمند" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">ایمیل *</label>
            <input required type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={field} placeholder="employee@example.com" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">
              رمز عبور {editing ? '(خالی = بدون تغییر)' : '*'}
            </label>
            <input
              type="password"
              required={!editing}
              minLength={editing ? undefined : 6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={field}
              placeholder="حداقل ۶ کاراکتر"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">نقش</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={field}>
              <option value="employee">کارمند — فقط سرنخ‌ها</option>
              <option value="super_admin">سوپرادمین — دسترسی کامل</option>
            </select>
          </div>
          {editing && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={!!form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })}
              />
              اکانت فعال باشد
            </label>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-100">
              انصراف
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60">
              {saving ? 'در حال ذخیره...' : editing ? 'ذخیره' : 'ایجاد اکانت'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
