import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Pencil, Trash2, Phone, Search, Filter, MessageCircle,
  UserRound, Building2, Flame, Clock, CheckCircle2, Ban, Target,
} from 'lucide-react';
import { api, formatDate, getAdmin, isSuperAdmin } from '../api';
import { useToast } from '../context/Toast';
import Modal from '../components/Modal';
import JalaliDateInput from '../components/JalaliDateInput';

const fa = (n) => new Intl.NumberFormat('fa-IR').format(n || 0);

const STATUS = {
  new: { label: 'جدید', tone: 'bg-slate-100 text-slate-700', icon: Target },
  no_answer: { label: 'عدم پاسخ', tone: 'bg-amber-50 text-amber-700', icon: Phone },
  follow_up: { label: 'نیاز به پیگیری', tone: 'bg-sky-50 text-sky-700', icon: Clock },
  whatsapp: { label: 'ارسال واتساپ', tone: 'bg-emerald-50 text-emerald-700', icon: MessageCircle },
  interested: { label: 'علاقه‌مند', tone: 'bg-violet-50 text-violet-700', icon: CheckCircle2 },
  burned: { label: 'سوخته', tone: 'bg-rose-50 text-rose-700', icon: Flame },
  converted: { label: 'تبدیل‌شده', tone: 'bg-teal-50 text-teal-700', icon: CheckCircle2 },
};

const TABS = [
  { key: 'all', label: 'همه' },
  { key: 'follow_due', label: 'پیگیری امروز' },
  { key: 'new', label: 'جدید' },
  { key: 'follow_up', label: 'پیگیری' },
  { key: 'whatsapp', label: 'واتساپ' },
  { key: 'no_answer', label: 'عدم پاسخ' },
  { key: 'interested', label: 'علاقه‌مند' },
  { key: 'burned', label: 'سوخته' },
  { key: 'converted', label: 'تبدیل‌شده' },
];

const field = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-sm';

const emptyForm = {
  person_name: '',
  business_name: '',
  phone: '',
  status: 'new',
  source: 'google',
  employee_name: '',
  notes: '',
  next_follow_up_at: '',
};

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.new;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.tone}`}>
      <Icon size={13} />
      {s.label}
    </span>
  );
}

function waLink(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  const intl = digits.startsWith('0') ? `98${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
}

function telLink(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits ? `tel:${digits}` : null;
}

export default function Leads() {
  const { show } = useToast();
  const [leads, setLeads] = useState([]);
  const [counts, setCounts] = useState({});
  const [employees, setEmployees] = useState([]);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [employee, setEmployee] = useState('');
  const [source, setSource] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (tab && tab !== 'all') params.set('status', tab);
      if (q.trim()) params.set('q', q.trim());
      if (employee) params.set('employee', employee);
      if (source) params.set('source', source);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      const data = await api(`/leads${qs ? `?${qs}` : ''}`);
      setLeads(data.leads || []);
      setCounts(data.counts || {});
      setEmployees(data.employees || []);
    } catch (e) {
      show(e.message, 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q, employee, source, from, to]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    const me = getAdmin();
    setForm({
      ...emptyForm,
      employee_name: !isSuperAdmin() ? (me?.name || '') : '',
    });
    setModalOpen(true);
  };

  const openEdit = (lead) => {
    setEditing(lead);
    setForm({
      person_name: lead.person_name || '',
      business_name: lead.business_name || '',
      phone: lead.phone || '',
      status: lead.status || 'new',
      source: lead.source || 'google',
      employee_name: lead.employee_name || '',
      notes: lead.notes || '',
      next_follow_up_at: (lead.next_follow_up_at || '').slice(0, 10),
    });
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        ...form,
        next_follow_up_at: form.next_follow_up_at || null,
      };
      if (editing) {
        await api(`/leads/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
        show('سرنخ به‌روزرسانی شد');
      } else {
        await api('/leads', { method: 'POST', body: JSON.stringify(body) });
        show('سرنخ ثبت شد');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (lead, status) => {
    try {
      await api(`/leads/${lead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      show(`وضعیت: ${STATUS[status]?.label || status}`);
      load();
    } catch (err) {
      show(err.message, 'error');
    }
  };

  const remove = async (lead) => {
    if (!confirm(`حذف سرنخ «${lead.person_name}»؟`)) return;
    try {
      await api(`/leads/${lead.id}`, { method: 'DELETE' });
      show('سرنخ حذف شد');
      load();
    } catch (err) {
      show(err.message, 'error');
    }
  };

  const clearFilters = () => {
    setQ('');
    setEmployee('');
    setSource('');
    setFrom('');
    setTo('');
  };

  const activeFilterCount = useMemo(
    () => [employee, source, from, to].filter(Boolean).length + (q.trim() ? 1 : 0),
    [employee, source, from, to, q],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Target className="text-brand-600" />
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">مدیریت سرنخ‌ها</h1>
            <p className="text-sm text-slate-500 mt-0.5">ثبت شماره‌های استخراج‌شده از گوگل و پیگیری تماس</p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 shadow-sm"
        >
          <Plus size={18} />
          سرنخ جدید
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'کل سرنخ‌ها', value: counts.all, tone: 'bg-slate-100 text-slate-600', icon: Target },
          { label: 'پیگیری امروز', value: counts.follow_due, tone: 'bg-sky-100 text-sky-700', icon: Clock },
          { label: 'واتساپ', value: counts.whatsapp, tone: 'bg-emerald-100 text-emerald-700', icon: MessageCircle },
          { label: 'سوخته', value: counts.burned, tone: 'bg-rose-100 text-rose-700', icon: Ban },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.tone}`}>
              <c.icon size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-400">{c.label}</div>
              <div className="font-bold text-slate-800 text-lg">{fa(c.value)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-3 sm:px-5 pt-4 border-b border-slate-100">
          <div className="flex gap-1 overflow-x-auto pb-3 scrollbar-thin">
            {TABS.map((t) => {
              const count = t.key === 'all' ? counts.all : counts[t.key];
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`shrink-0 px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                    active
                      ? 'bg-brand-600 text-white shadow'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t.label}
                  {count != null && (
                    <span className={`mr-1.5 text-xs ${active ? 'text-white/80' : 'text-slate-400'}`}>
                      {fa(count)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 sm:px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[12rem]">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجو نام، مجموعه، شماره..."
              className={`${field} pr-9`}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium ${
              showFilters || activeFilterCount
                ? 'border-brand-300 bg-brand-50 text-brand-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter size={16} />
            فیلتر
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center">
                {fa(activeFilterCount)}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="px-4 sm:px-5 py-4 bg-slate-50/80 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">کارمند</label>
              <select value={employee} onChange={(e) => setEmployee(e.target.value)} className={field}>
                <option value="">همه کارمندان</option>
                {employees.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">منبع</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className={field}>
                <option value="">همه منابع</option>
                <option value="google">گوگل</option>
                <option value="instagram">اینستاگرام</option>
                <option value="referral">معرفی</option>
                <option value="other">سایر</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">از تاریخ</label>
              <JalaliDateInput value={from} onChange={setFrom} className={field} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">تا تاریخ</label>
              <JalaliDateInput value={to} onChange={setTo} className={field} />
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
              <button type="button" onClick={clearFilters} className="text-sm text-slate-500 hover:text-brand-600">
                پاک کردن فیلترها
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {leads.length === 0 && (
            <div className="py-16 text-center text-slate-400 text-sm">سرنخی یافت نشد</div>
          )}
          {leads.map((lead) => {
            const call = telLink(lead.phone);
            const wa = waLink(lead.phone);
            return (
              <div key={lead.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className="font-bold text-slate-800">{lead.person_name}</h3>
                      <StatusBadge status={lead.status} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                      {lead.business_name && (
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 size={14} className="text-slate-400" />
                          {lead.business_name}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-700" dir="ltr">
                        <Phone size={14} className="text-slate-400" />
                        {lead.phone}
                      </span>
                      {lead.employee_name && (
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound size={14} className="text-slate-400" />
                          {lead.employee_name}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">ثبت: {formatDate(lead.created_at)}</span>
                      {lead.next_follow_up_at && (
                        <span className="text-xs text-sky-600">پیگیری: {formatDate(lead.next_follow_up_at)}</span>
                      )}
                    </div>
                    {lead.notes && (
                      <p className="mt-2 text-sm text-slate-600 line-clamp-2">{lead.notes}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {call && (
                      <a
                        href={call}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100"
                      >
                        <Phone size={14} />
                        تماس
                      </a>
                    )}
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100"
                      >
                        <MessageCircle size={14} />
                        واتساپ
                      </a>
                    )}
                    <select
                      value={lead.status}
                      onChange={(e) => setStatus(lead, e.target.value)}
                      className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                      title="تغییر وضعیت"
                    >
                      {Object.entries(STATUS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => openEdit(lead)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-sky-50 hover:text-sky-600"
                      title="ویرایش"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(lead)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'ویرایش سرنخ' : 'سرنخ جدید'} wide>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">نام شخص *</label>
              <input required value={form.person_name} onChange={(e) => setForm({ ...form, person_name: e.target.value })} className={field} placeholder="مثلاً سارا محمدی" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">نام مجموعه</label>
              <input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className={field} placeholder="مثلاً سالن زیبایی رز" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">شماره تماس *</label>
              <input required dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={field} placeholder="0912..." />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">کارمند ثبت‌کننده</label>
              <input
                list="lead-employees"
                value={form.employee_name}
                onChange={(e) => setForm({ ...form, employee_name: e.target.value })}
                className={field}
                placeholder="نام کارمند"
                readOnly={!isSuperAdmin()}
              />
              {isSuperAdmin() && (
                <datalist id="lead-employees">
                  {employees.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              )}
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">وضعیت</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={field}>
                {Object.entries(STATUS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">منبع</label>
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className={field}>
                <option value="google">گوگل</option>
                <option value="instagram">اینستاگرام</option>
                <option value="referral">معرفی</option>
                <option value="other">سایر</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">تاریخ پیگیری بعدی</label>
              <JalaliDateInput
                value={form.next_follow_up_at}
                onChange={(v) => setForm({ ...form, next_follow_up_at: v })}
                className={field}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">یادداشت</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={field}
                placeholder="نتیجه تماس، جزئیات گفتگو..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-100">
              انصراف
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? 'در حال ذخیره...' : editing ? 'ذخیره تغییرات' : 'ثبت سرنخ'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
