import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Users, CalendarCheck, Star, Scissors, Images } from 'lucide-react';
import { api, getUser } from '../../../shared/api';
import { useToast } from '../context/Toast';
import { useVertical } from '../context/Vertical';
import StaffFormDrawer from '../components/StaffFormDrawer';
import StaffMyProfile from '../components/StaffMyProfile';

const emptyForm = {
  display_name: '',
  bio: '',
  email: '',
  password: '',
  color_hex: '#be185d',
  service_ids: [],
  is_accepting_bookings: 1,
  satisfaction_percent: 98,
  avatar_path: '',
  avatar_url: '',
};

export default function Staff() {
  const { labels, verticalFeatures } = useVertical();
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const user = getUser();
  const isStaffRole = user?.role === 'staff';
  const showPortfolio = verticalFeatures.staff_portfolio !== false;

  const load = () => {
    setLoading(true);
    if (isStaffRole) {
      api('/admin/staff')
        .then((st) => {
          setStaff(Array.isArray(st) ? st : []);
          setServices([]);
        })
        .catch((e) => toast.show(e.message, 'error'))
        .finally(() => setLoading(false));
      return;
    }

    Promise.all([api('/admin/staff'), api('/admin/services')])
      .then(([st, svc]) => {
        setStaff(Array.isArray(st) ? st : []);
        setServices(svc.services || []);
      })
      .catch((e) => toast.show(e.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [isStaffRole]);

  const staffStats = useMemo(() => {
    const total = staff.length;
    const accepting = staff.filter((s) => s.is_accepting_bookings == 1).length;
    return { total, accepting };
  }, [staff]);

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setDrawerOpen(true);
  };

  const openEdit = (s) => {
    setEditId(s.id);
    setForm({
      display_name: s.display_name,
      bio: s.bio || '',
      email: '',
      password: '',
      color_hex: s.color_hex || '#be185d',
      is_accepting_bookings: s.is_accepting_bookings,
      satisfaction_percent: s.satisfaction_percent ?? 98,
      avatar_path: s.avatar_path || '',
      avatar_url: s.avatar_url || '',
      service_ids: (s.service_ids || []).map(Number),
    });
    setDrawerOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, service_ids: form.service_ids.map(Number) };
      if (editId) {
        await api(`/admin/staff/${editId}`, { method: 'PUT', body: JSON.stringify(body) });
        toast.show('پرسنل ویرایش شد');
      } else {
        if (!body.email || !body.password) {
          toast.show('برای پرسنل جدید ایمیل و رمز الزامی است', 'error');
          return;
        }
        await api('/admin/staff', { method: 'POST', body: JSON.stringify(body) });
        toast.show('پرسنل اضافه شد');
      }
      closeDrawer();
      load();
    } catch (err) {
      toast.show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isStaffRole ? 'پروفایل من' : labels.staff}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isStaffRole
              ? 'اطلاعات خود را در همین صفحه مدیریت کنید'
              : `مدیریت ${labels.staff} و ${labels.services} قابل ارائه`}
          </p>
        </div>
        {!isStaffRole && (
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {labels.staff_singular} جدید
          </button>
        )}
      </header>

      {!isStaffRole && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: `کل ${labels.staff}`, value: staffStats.total, icon: Users, tone: 'bg-pink-100 text-pink-600' },
            { label: 'پذیرش نوبت', value: staffStats.accepting, icon: CalendarCheck, tone: 'bg-emerald-100 text-emerald-600' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.tone}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="text-2xl font-bold text-slate-900">{new Intl.NumberFormat('fa-IR').format(s.value)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : staff.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="font-medium text-slate-700">
            {isStaffRole ? `پروفایل ${labels.staff_singular} یافت نشد` : `هنوز ${labels.staff}ی ثبت نشده`}
          </p>
          {!isStaffRole && (
            <button
              type="button"
              onClick={openAdd}
              className="mt-4 inline-flex items-center gap-2 text-sm text-pink-600 font-semibold hover:underline"
            >
              <Plus className="w-4 h-4" />
              افزودن اولین {labels.staff_singular}
            </button>
          )}
        </div>
      ) : isStaffRole ? (
        <StaffMyProfile staff={staff[0]} onSaved={load} />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {staff.map((s) => {
            const accepting = s.is_accepting_bookings == 1;
            const color = s.color_hex || '#be185d';
            return (
              <div
                key={s.id}
                className="group relative bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md hover:border-pink-200 transition"
              >
                <div className="h-14 w-full" style={{ background: `linear-gradient(135deg, ${color}, ${color}b3)` }} />
                <button
                  type="button"
                  onClick={() => openEdit(s)}
                  className="absolute top-3 left-3 inline-flex items-center gap-1 text-xs bg-white/90 hover:bg-white text-slate-700 px-2.5 py-1.5 rounded-lg shadow-sm backdrop-blur transition"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  ویرایش
                </button>

                <div className="px-5 pb-5 -mt-8">
                  {s.avatar_url ? (
                    <img
                      src={s.avatar_url}
                      alt={s.display_name}
                      className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white shadow-sm bg-white"
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold ring-4 ring-white shadow-sm"
                      style={{ backgroundColor: color }}
                    >
                      {s.display_name?.charAt(0)}
                    </div>
                  )}

                  <div className="mt-3">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800 truncate">{s.display_name}</p>
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${accepting ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        title={accepting ? 'پذیرش نوبت' : 'عدم پذیرش'}
                      />
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{s.email || 'بدون حساب کاربری'}</p>
                  </div>

                  {typeof s.satisfaction_percent === 'number' && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          رضایت مشتریان
                        </span>
                        <span className="font-bold text-slate-700">
                          {new Intl.NumberFormat('fa-IR').format(s.satisfaction_percent)}٪
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-l from-amber-400 to-amber-500" style={{ width: `${s.satisfaction_percent}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${accepting ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {accepting ? 'پذیرش نوبت' : 'عدم پذیرش'}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-pink-50 text-pink-700 font-medium flex items-center gap-1">
                      <Scissors className="w-3 h-3" />
                      {new Intl.NumberFormat('fa-IR').format((s.service_ids || []).length)} {labels.service}
                    </span>
                    {showPortfolio && (s.portfolio_count || 0) > 0 && (
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 font-medium flex items-center gap-1">
                        <Images className="w-3 h-3" />
                        {new Intl.NumberFormat('fa-IR').format(s.portfolio_count)} نمونه‌کار
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isStaffRole && (
        <StaffFormDrawer
          open={drawerOpen}
          onClose={closeDrawer}
          form={form}
          setForm={setForm}
          editId={editId}
          services={services}
          onSubmit={save}
          saving={saving}
        />
      )}
    </div>
  );
}
