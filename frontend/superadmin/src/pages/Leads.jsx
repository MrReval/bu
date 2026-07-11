import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Pencil, Trash2, Phone, Search, Filter, MessageCircle,
  UserRound, Building2, Flame, Clock, CheckCircle2, Ban, Target,
  Upload, Star, History, Zap, TrendingUp, CalendarPlus,
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

const PRIORITY = {
  high: { label: 'فوری', tone: 'bg-rose-100 text-rose-700' },
  normal: { label: 'عادی', tone: 'bg-slate-100 text-slate-600' },
  low: { label: 'کم', tone: 'bg-slate-50 text-slate-400' },
};

const WA_TEMPLATES = [
  {
    id: 'intro',
    label: 'معرفی اولیه',
    text: (l) => `سلام${l.person_name ? ` ${l.person_name}` : ''} عزیز 👋\nمن از تیم پلتفرم سالن هستم.\nبرای ${l.business_name || 'سالن شما'} یک وب‌سایت نوبت‌دهی آنلاین آماده داریم.\nاگر مایلید جزئیات و دمو را براتون بفرستم؟`,
  },
  {
    id: 'demo',
    label: 'ارسال دمو',
    text: (l) => `سلام${l.person_name ? ` ${l.person_name}` : ''}\nطبق صحبت قبلی، لینک دمو و اطلاعات پکیج‌ها رو براتون می‌فرستم.\nهر سوالی داشتید در خدمتم.`,
  },
  {
    id: 'follow',
    label: 'پیگیری',
    text: (l) => `سلام${l.person_name ? ` ${l.person_name}` : ''} عزیز\nخواستم پیگیری کنم ببینم فرصت کردید درباره سیستم نوبت‌دهی فکر کنید؟\nاگر سوالی هست خوشحال می‌شم راهنمایی کنم.`,
  },
];

const QUICK_OUTCOMES = [
  { status: 'no_answer', label: 'عدم پاسخ', type: 'call' },
  { status: 'follow_up', label: 'پیگیری', type: 'call' },
  { status: 'whatsapp', label: 'واتساپ بفرست', type: 'whatsapp' },
  { status: 'interested', label: 'علاقه‌مند', type: 'call' },
  { status: 'burned', label: 'سوخته', type: 'call' },
  { status: 'converted', label: 'تبدیل شد', type: 'call' },
];

const field = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-sm';

const emptyForm = {
  person_name: '',
  business_name: '',
  phone: '',
  status: 'new',
  priority: 'normal',
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

function PriorityBadge({ priority }) {
  if (!priority || priority === 'normal') return null;
  const p = PRIORITY[priority] || PRIORITY.normal;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${p.tone}`}>
      <Star size={11} />
      {p.label}
    </span>
  );
}

function waLink(phone, text) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  const intl = digits.startsWith('0') ? `98${digits.slice(1)}` : digits;
  const base = `https://wa.me/${intl}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

function telLink(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits ? `tel:${digits}` : null;
}

function dateTime(d) {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(d));
  } catch {
    return d;
  }
}

function followLabel(d) {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return formatDate(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(t);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((day - today) / 86400000);
  if (diff < 0) return `عقب‌افتاده (${formatDate(d)})`;
  if (diff === 0) return 'امروز';
  if (diff === 1) return 'فردا';
  return formatDate(d);
}

export default function Leads() {
  const { show } = useToast();
  const me = getAdmin();
  const superUser = isSuperAdmin();
  const [leads, setLeads] = useState([]);
  const [counts, setCounts] = useState({});
  const [stats, setStats] = useState({});
  const [employees, setEmployees] = useState([]);
  const [tab, setTab] = useState(superUser ? 'follow_due' : 'mine');
  const [q, setQ] = useState('');
  const [employee, setEmployee] = useState('');
  const [source, setSource] = useState('');
  const [priority, setPriority] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [outcomeLead, setOutcomeLead] = useState(null);
  const [outcome, setOutcome] = useState({ status: 'follow_up', notes: '', next_follow_up_at: '', type: 'call' });
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [waLead, setWaLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [detailLead, setDetailLead] = useState(null);

  const tabs = useMemo(() => {
    const base = [
      { key: 'follow_due', label: 'پیگیری امروز' },
      { key: 'high', label: 'فوری' },
      { key: 'new', label: 'جدید' },
      { key: 'follow_up', label: 'پیگیری' },
      { key: 'whatsapp', label: 'واتساپ' },
      { key: 'no_answer', label: 'عدم پاسخ' },
      { key: 'interested', label: 'علاقه‌مند' },
      { key: 'converted', label: 'تبدیل‌شده' },
      { key: 'burned', label: 'سوخته' },
      { key: 'all', label: 'همه' },
    ];
    if (!superUser) {
      return [{ key: 'mine', label: 'سرنخ‌های من' }, ...base];
    }
    return base;
  }, [superUser]);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (tab && tab !== 'all') params.set('status', tab);
      if (tab === 'mine' && me?.name) {
        params.set('mine', me.name);
        params.set('employee', me.name);
      }
      if (q.trim()) params.set('q', q.trim());
      if (employee) params.set('employee', employee);
      if (source) params.set('source', source);
      if (priority) params.set('priority', priority);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      const data = await api(`/leads${qs ? `?${qs}` : ''}`);
      setLeads(data.leads || []);
      setCounts(data.counts || {});
      setStats(data.stats || {});
      setEmployees(data.employees || []);
    } catch (e) {
      show(e.message, 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q, employee, source, priority, from, to, me?.name]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      employee_name: !superUser ? (me?.name || '') : '',
    });
    setModalOpen(true);
  };

  const openEdit = async (lead) => {
    setEditing(lead);
    setForm({
      person_name: lead.person_name || '',
      business_name: lead.business_name || '',
      phone: lead.phone || '',
      status: lead.status || 'new',
      priority: lead.priority || 'normal',
      source: lead.source || 'google',
      employee_name: lead.employee_name || '',
      notes: lead.notes || '',
      next_follow_up_at: (lead.next_follow_up_at || '').slice(0, 10),
    });
    setModalOpen(true);
    try {
      const d = await api(`/leads/${lead.id}/activities`);
      setActivities(d.activities || []);
    } catch {
      setActivities([]);
    }
  };

  const openDetail = async (lead) => {
    setDetailLead(lead);
    try {
      const d = await api(`/leads/${lead.id}/activities`);
      setActivities(d.activities || []);
    } catch {
      setActivities([]);
    }
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
      await api(`/leads/${lead.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      show(`وضعیت: ${STATUS[status]?.label || status}`);
      load();
    } catch (err) {
      show(err.message, 'error');
    }
  };

  const setPriorityQuick = async (lead, p) => {
    try {
      await api(`/leads/${lead.id}`, { method: 'PATCH', body: JSON.stringify({ priority: p }) });
      load();
    } catch (err) {
      show(err.message, 'error');
    }
  };

  const openOutcome = (lead, type = 'call') => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const ymd = tomorrow.toISOString().slice(0, 10);
    setOutcomeLead(lead);
    setOutcome({
      status: type === 'whatsapp' ? 'whatsapp' : 'follow_up',
      notes: '',
      next_follow_up_at: ymd,
      type,
    });
    if (type === 'call') {
      const link = telLink(lead.phone);
      if (link) window.open(link, '_self');
    }
  };

  const saveOutcome = async (e) => {
    e?.preventDefault?.();
    if (!outcomeLead) return;
    setSaving(true);
    try {
      await api(`/leads/${outcomeLead.id}/outcome`, {
        method: 'POST',
        body: JSON.stringify({
          type: outcome.type,
          status: outcome.status,
          notes: outcome.notes,
          next_follow_up_at: outcome.next_follow_up_at || null,
        }),
      });
      show('نتیجه تماس ثبت شد');
      setOutcomeLead(null);
      load();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setSaving(false);
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

  const submitBulk = async (e) => {
    e.preventDefault();
    setBulkSaving(true);
    try {
      const res = await api('/leads/bulk', {
        method: 'POST',
        body: JSON.stringify({
          text: bulkText,
          source: 'google',
          employee_name: superUser ? employee || '' : (me?.name || ''),
        }),
      });
      show(`ثبت شد: ${fa(res.created)} | تکراری: ${fa(res.skipped)}${res.errors?.length ? ` | خطا: ${fa(res.errors.length)}` : ''}`);
      setBulkOpen(false);
      setBulkText('');
      load();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setBulkSaving(false);
    }
  };

  const clearFilters = () => {
    setQ('');
    setEmployee('');
    setSource('');
    setPriority('');
    setFrom('');
    setTo('');
  };

  const activeFilterCount = useMemo(
    () => [employee, source, priority, from, to].filter(Boolean).length + (q.trim() ? 1 : 0),
    [employee, source, priority, from, to, q],
  );

  const openWhatsApp = (lead, templateId) => {
    const tpl = WA_TEMPLATES.find((t) => t.id === templateId) || WA_TEMPLATES[0];
    const link = waLink(lead.phone, tpl.text(lead));
    if (link) window.open(link, '_blank');
    setWaLead(null);
    openOutcome(lead, 'whatsapp');
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Target className="text-brand-600" />
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">میز فروش / سرنخ‌ها</h1>
            <p className="text-sm text-slate-500 mt-0.5">ثبت، تماس، پیگیری و تبدیل سرنخ‌های تیم فروش</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
          >
            <Upload size={17} />
            ایمپورت گروهی
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 shadow-sm"
          >
            <Plus size={18} />
            سرنخ جدید
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'پیگیری امروز', value: counts.follow_due, tone: 'bg-sky-100 text-sky-700', icon: Clock },
          { label: 'فوری', value: counts.high, tone: 'bg-rose-100 text-rose-700', icon: Zap },
          { label: 'ثبت امروز', value: stats.new_today, tone: 'bg-slate-100 text-slate-600', icon: Plus },
          { label: 'تماس امروز', value: stats.contacted_today, tone: 'bg-amber-100 text-amber-700', icon: Phone },
          { label: 'تبدیل ۷ روز', value: stats.converted_week, tone: 'bg-teal-100 text-teal-700', icon: TrendingUp },
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
          <div className="flex gap-1 overflow-x-auto pb-3">
            {tabs.map((t) => {
              const count = t.key === 'all' ? counts.all : counts[t.key];
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`shrink-0 px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                    active ? 'bg-brand-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
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
          <div className="px-4 sm:px-5 py-4 bg-slate-50/80 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {superUser && (
              <div>
                <label className="text-xs text-slate-500 mb-1 block">کارمند</label>
                <select value={employee} onChange={(e) => setEmployee(e.target.value)} className={field}>
                  <option value="">همه کارمندان</option>
                  {employees.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">اولویت</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={field}>
                <option value="">همه</option>
                <option value="high">فوری</option>
                <option value="normal">عادی</option>
                <option value="low">کم</option>
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
            <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
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
            const overdue = lead.next_follow_up_at && new Date(lead.next_follow_up_at) <= new Date();
            return (
              <div
                key={lead.id}
                className={`p-4 sm:p-5 hover:bg-slate-50/60 transition ${
                  lead.priority === 'high' ? 'border-r-4 border-r-rose-400' : ''
                } ${overdue && !['burned', 'converted'].includes(lead.status) ? 'bg-sky-50/40' : ''}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <button type="button" onClick={() => openDetail(lead)} className="font-bold text-slate-800 hover:text-brand-700 text-right">
                        {lead.person_name}
                      </button>
                      <StatusBadge status={lead.status} />
                      <PriorityBadge priority={lead.priority} />
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
                      {lead.next_follow_up_at && (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${overdue ? 'text-rose-600' : 'text-sky-600'}`}>
                          <CalendarPlus size={13} />
                          پیگیری: {followLabel(lead.next_follow_up_at)}
                        </span>
                      )}
                      {lead.last_contacted_at && (
                        <span className="text-xs text-slate-400">آخرین تماس: {formatDate(lead.last_contacted_at)}</span>
                      )}
                    </div>
                    {lead.notes && (
                      <p className="mt-2 text-sm text-slate-600 line-clamp-2 whitespace-pre-line">{lead.notes}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openOutcome(lead, 'call')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100"
                    >
                      <Phone size={14} />
                      تماس + ثبت
                    </button>
                    <button
                      type="button"
                      onClick={() => setWaLead(lead)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100"
                    >
                      <MessageCircle size={14} />
                      واتساپ
                    </button>
                    <select
                      value={lead.status}
                      onChange={(e) => setStatus(lead, e.target.value)}
                      className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                    >
                      {Object.entries(STATUS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                    <select
                      value={lead.priority || 'normal'}
                      onChange={(e) => setPriorityQuick(lead, e.target.value)}
                      className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                      title="اولویت"
                    >
                      <option value="high">فوری</option>
                      <option value="normal">عادی</option>
                      <option value="low">کم</option>
                    </select>
                    <button type="button" onClick={() => openEdit(lead)} className="p-2 rounded-lg text-slate-400 hover:bg-sky-50 hover:text-sky-600" title="ویرایش">
                      <Pencil size={16} />
                    </button>
                    <button type="button" onClick={() => remove(lead)} className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="حذف">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* فرم ایجاد/ویرایش */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'ویرایش سرنخ' : 'سرنخ جدید'} wide>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">نام شخص *</label>
              <input required value={form.person_name} onChange={(e) => setForm({ ...form, person_name: e.target.value })} className={field} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">نام مجموعه</label>
              <input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className={field} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">شماره تماس *</label>
              <input required dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={field} placeholder="0912..." />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">کارمند مسئول</label>
              <input
                list="lead-employees"
                value={form.employee_name}
                onChange={(e) => setForm({ ...form, employee_name: e.target.value })}
                className={field}
                readOnly={!superUser}
              />
              {superUser && (
                <datalist id="lead-employees">
                  {employees.map((name) => <option key={name} value={name} />)}
                </datalist>
              )}
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">وضعیت</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={field}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">اولویت</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={field}>
                <option value="high">فوری</option>
                <option value="normal">عادی</option>
                <option value="low">کم</option>
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
            <div>
              <label className="text-xs text-slate-500 mb-1 block">تاریخ پیگیری بعدی</label>
              <JalaliDateInput value={form.next_follow_up_at} onChange={(v) => setForm({ ...form, next_follow_up_at: v })} className={field} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">یادداشت</label>
              <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={field} placeholder="نتیجه تماس، جزئیات گفتگو..." />
            </div>
          </div>

          {editing && activities.length > 0 && (
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-bold text-slate-700">
                <History size={16} /> تاریخچه فعالیت
              </div>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {activities.map((a) => (
                  <div key={a.id} className="text-xs bg-slate-50 rounded-xl px-3 py-2">
                    <div className="flex justify-between gap-2 text-slate-400 mb-0.5">
                      <span>{a.admin_name || 'سیستم'} · {a.type}</span>
                      <span>{dateTime(a.created_at)}</span>
                    </div>
                    <div className="text-slate-700">{a.message}</div>
                    {a.old_status && a.new_status && a.old_status !== a.new_status && (
                      <div className="text-slate-400 mt-0.5">
                        {STATUS[a.old_status]?.label || a.old_status} → {STATUS[a.new_status]?.label || a.new_status}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-100">انصراف</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60">
              {saving ? 'در حال ذخیره...' : editing ? 'ذخیره تغییرات' : 'ثبت سرنخ'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ثبت نتیجه تماس */}
      <Modal open={!!outcomeLead} onClose={() => setOutcomeLead(null)} title={`نتیجه تماس — ${outcomeLead?.person_name || ''}`}>
        <form onSubmit={saveOutcome} className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {QUICK_OUTCOMES.map((o) => (
              <button
                key={o.status}
                type="button"
                onClick={() => setOutcome((x) => ({ ...x, status: o.status, type: o.type }))}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                  outcome.status === o.status
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">یادداشت نتیجه</label>
            <textarea
              rows={3}
              value={outcome.notes}
              onChange={(e) => setOutcome({ ...outcome, notes: e.target.value })}
              className={field}
              placeholder="مثلاً: پاسخ نداد / گفت فردا تماس بگیر / خواست پکیج پلاس..."
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">پیگیری بعدی</label>
            <JalaliDateInput
              value={outcome.next_follow_up_at}
              onChange={(v) => setOutcome({ ...outcome, next_follow_up_at: v })}
              className={field}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOutcomeLead(null)} className="px-4 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-100">بستن</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold disabled:opacity-60">
              ثبت نتیجه
            </button>
          </div>
        </form>
      </Modal>

      {/* قالب واتساپ */}
      <Modal open={!!waLead} onClose={() => setWaLead(null)} title="ارسال واتساپ">
        <div className="space-y-3">
          <p className="text-sm text-slate-500">یک قالب انتخاب کنید؛ بعد از باز شدن واتساپ، نتیجه را ثبت کنید.</p>
          {WA_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => openWhatsApp(waLead, t.id)}
              className="w-full text-right p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition"
            >
              <div className="font-bold text-slate-800 text-sm mb-1">{t.label}</div>
              <div className="text-xs text-slate-500 whitespace-pre-line line-clamp-3">{t.text(waLead || {})}</div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              const link = waLink(waLead?.phone);
              if (link) window.open(link, '_blank');
              const lead = waLead;
              setWaLead(null);
              if (lead) openOutcome(lead, 'whatsapp');
            }}
            className="w-full py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-100"
          >
            باز کردن بدون قالب
          </button>
        </div>
      </Modal>

      {/* جزئیات + تاریخچه */}
      <Modal open={!!detailLead} onClose={() => setDetailLead(null)} title={detailLead?.person_name || 'جزئیات'} wide>
        {detailLead && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={detailLead.status} />
              <PriorityBadge priority={detailLead.priority} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-400">مجموعه:</span> {detailLead.business_name || '—'}</div>
              <div dir="ltr"><span className="text-slate-400">شماره:</span> {detailLead.phone}</div>
              <div><span className="text-slate-400">مسئول:</span> {detailLead.employee_name || '—'}</div>
              <div><span className="text-slate-400">منبع:</span> {detailLead.source}</div>
            </div>
            {detailLead.notes && (
              <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-700 whitespace-pre-line">{detailLead.notes}</div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm font-bold text-slate-700">
                <History size={16} /> تاریخچه
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {activities.length === 0 && <div className="text-sm text-slate-400">هنوز فعالیتی ثبت نشده</div>}
                {activities.map((a) => (
                  <div key={a.id} className="text-xs bg-slate-50 rounded-xl px-3 py-2">
                    <div className="flex justify-between text-slate-400 mb-0.5">
                      <span>{a.admin_name || 'سیستم'} · {a.type}</span>
                      <span>{dateTime(a.created_at)}</span>
                    </div>
                    <div className="text-slate-700">{a.message}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button type="button" onClick={() => { setDetailLead(null); openOutcome(detailLead, 'call'); }} className="px-4 py-2 rounded-xl bg-sky-50 text-sky-700 text-sm font-semibold">تماس + ثبت</button>
              <button type="button" onClick={() => { setDetailLead(null); setWaLead(detailLead); }} className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold">واتساپ</button>
              <button type="button" onClick={() => { setDetailLead(null); openEdit(detailLead); }} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold">ویرایش</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ایمپورت گروهی */}
      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="ایمپورت گروهی سرنخ" wide>
        <form onSubmit={submitBulk} className="space-y-4">
          <p className="text-sm text-slate-500">
            هر خط یک سرنخ. فرمتها:
            <br />
            <code className="text-xs bg-slate-100 px-1 rounded">نام | مجموعه | شماره</code>
            {' '}یا{' '}
            <code className="text-xs bg-slate-100 px-1 rounded">نام | شماره</code>
            {' '}یا فقط{' '}
            <code className="text-xs bg-slate-100 px-1 rounded">شماره</code>
          </p>
          <textarea
            required
            rows={10}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className={`${field} font-mono text-xs`}
            placeholder={'سارا محمدی | سالن رز | 09121234567\nعلی رضایی | 09129876543\n09121112233'}
            dir="rtl"
          />
          {superUser && (
            <div>
              <label className="text-xs text-slate-500 mb-1 block">اختصاص به کارمند</label>
              <select value={employee} onChange={(e) => setEmployee(e.target.value)} className={field}>
                <option value="">— بدون اختصاص —</option>
                {employees.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setBulkOpen(false)} className="px-4 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-100">انصراف</button>
            <button type="submit" disabled={bulkSaving} className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold disabled:opacity-60">
              {bulkSaving ? 'در حال ثبت...' : 'ثبت گروهی'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
