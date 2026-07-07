import { useEffect, useMemo, useState } from 'react';

import { Plus, Pencil } from 'lucide-react';

import { api, getUser } from '../../../shared/api';

import { useToast } from '../context/Toast';

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

            {isStaffRole ? 'پروفایل من' : 'پرسنل'}

          </h1>

          <p className="text-slate-500 text-sm mt-1">

            {isStaffRole

              ? 'اطلاعات و نمونه کارهای خود را در همین صفحه مدیریت کنید'

              : 'مدیریت پرسنل و خدمات قابل ارائه'}

          </p>

        </div>

        {!isStaffRole && (

          <button

            type="button"

            onClick={openAdd}

            className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm"

          >

            <Plus className="w-4 h-4" />

            پرسنل جدید

          </button>

        )}

      </header>



      {!isStaffRole && (

        <div className="grid grid-cols-2 gap-4">

          {[

            { label: 'کل پرسنل', value: staffStats.total },

            { label: 'پذیرش نوبت', value: staffStats.accepting },

          ].map((s) => (

            <div key={s.label} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">

              <p className="text-xs text-slate-500">{s.label}</p>

              <p className="text-2xl font-bold text-slate-900 mt-1">{s.value}</p>

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

            {isStaffRole ? 'پروفایل پرسنل یافت نشد' : 'هنوز پرسنلی ثبت نشده'}

          </p>

          {!isStaffRole && (

            <button

              type="button"

              onClick={openAdd}

              className="mt-4 inline-flex items-center gap-2 text-sm text-pink-600 font-semibold hover:underline"

            >

              <Plus className="w-4 h-4" />

              افزودن اولین پرسنل

            </button>

          )}

        </div>

      ) : isStaffRole ? (

        <StaffMyProfile staff={staff[0]} onSaved={load} />

      ) : (

        <div className="grid sm:grid-cols-2 gap-4">

          {staff.map((s) => (

            <div key={s.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex gap-4 hover:border-pink-200 transition">

              {s.avatar_url ? (

                <img src={s.avatar_url} alt="" className="w-12 h-12 rounded-2xl shrink-0 object-cover" />

              ) : (

                <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center text-white font-bold" style={{ backgroundColor: s.color_hex }}>

                  {s.display_name?.charAt(0)}

                </div>

              )}

              <div className="flex-1 min-w-0">

                <p className="font-semibold text-slate-800">{s.display_name}</p>

                <p className="text-xs text-slate-500 truncate">{s.email || 'بدون حساب کاربری'}</p>

                <div className="flex flex-wrap gap-2 mt-2">

                  {s.is_accepting_bookings == 1 ? (

                    <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">پذیرش نوبت</span>

                  ) : (

                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">عدم پذیرش</span>

                  )}

                  {(s.service_ids || []).length > 0 && (

                    <span className="text-xs bg-pink-50 text-pink-700 px-2 py-0.5 rounded-md">

                      {(s.service_ids || []).length} خدمت

                    </span>

                  )}

                  {(s.portfolio_count || 0) > 0 && (

                    <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-md">

                      {s.portfolio_count} نمونه کار

                    </span>

                  )}

                </div>

                <button

                  type="button"

                  onClick={() => openEdit(s)}

                  className="mt-3 inline-flex items-center gap-1 text-sm text-pink-700 hover:bg-pink-50 px-3 py-1.5 rounded-lg"

                >

                  <Pencil className="w-3.5 h-3.5" />

                  ویرایش

                </button>

              </div>

            </div>

          ))}

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


