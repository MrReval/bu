import { useEffect, useMemo, useState } from 'react';
import { Scissors, Pencil, Trash2, Plus } from 'lucide-react';
import { api, formatPrice } from '../../../shared/api';
import { getCategoryIconComponent } from '../../../shared/categoryIcons';
import { useToast } from '../context/Toast';
import { useVertical } from '../context/Vertical';
import ServiceFormDrawer from '../components/ServiceFormDrawer';

const empty = { name: '', description: '', duration_minutes: 30, price: 0, category_id: '', deposit_percent: 0, is_active: 1 };

export default function Services() {
  const { labels } = useVertical();
  const [data, setData] = useState({ categories: [], services: [] });
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    api('/admin/services')
      .then(setData)
      .catch((e) => toast.show(e.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const countByCategory = useMemo(() => {
    const map = { all: data.services.length, none: 0 };
    data.categories.forEach((c) => {
      map[c.id] = data.services.filter((s) => String(s.category_id) === String(c.id)).length;
    });
    map.none = data.services.filter((s) => !s.category_id).length;
    return map;
  }, [data]);

  const filteredServices = useMemo(() => {
    if (activeTab === 'all') return data.services;
    if (activeTab === 'none') return data.services.filter((s) => !s.category_id);
    return data.services.filter((s) => String(s.category_id) === String(activeTab));
  }, [data.services, activeTab]);

  const categoryName = (id) =>
    data.categories.find((c) => String(c.id) === String(id))?.name || null;

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditId(null);
    setForm(empty);
  };

  const openAdd = () => {
    const category_id =
      activeTab !== 'all' && activeTab !== 'none' ? String(activeTab) : '';
    setEditId(null);
    setForm({ ...empty, category_id });
    setDrawerOpen(true);
  };

  const openEdit = (s) => {
    setForm({ ...s, category_id: s.category_id || '' });
    setEditId(s.id);
    if (s.category_id) setActiveTab(String(s.category_id));
    setDrawerOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        ...form,
        category_id: form.category_id || null,
        price: +form.price,
        duration_minutes: +form.duration_minutes,
        deposit_percent: +(form.deposit_percent || 0),
        is_active: +form.is_active,
      };
      if (editId) {
        await api(`/admin/services/${editId}`, { method: 'PUT', body: JSON.stringify(body) });
        toast.show('خدمت ویرایش شد');
      } else {
        await api('/admin/services', { method: 'POST', body: JSON.stringify(body) });
        toast.show('خدمت اضافه شد');
      }
      closeDrawer();
      load();
    } catch (err) {
      toast.show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('این خدمت حذف شود؟')) return;
    try {
      await api(`/admin/services/${id}`, { method: 'DELETE' });
      toast.show('حذف شد');
      load();
    } catch (e) {
      toast.show(e.message, 'error');
    }
  };

  const tabs = [
    { id: 'all', label: 'همه', count: countByCategory.all },
    ...data.categories.map((c) => ({
      id: String(c.id),
      label: c.name,
      count: countByCategory[c.id] ?? 0,
    })),
    ...(countByCategory.none > 0 ? [{ id: 'none', label: 'بدون دسته', count: countByCategory.none }] : []),
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">خدمات</h1>
          <p className="text-slate-500 text-sm mt-1">مدیریت و دسته‌بندی {labels.services}</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm"
        >
          <Plus className="w-4 h-4" />
          خدمت جدید
        </button>
      </header>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            const Icon =
              tab.id === 'all' || tab.id === 'none'
                ? Scissors
                : getCategoryIconComponent(tab.label);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                  active
                    ? 'bg-pink-600 text-white shadow-md shadow-pink-600/20'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.25 : 2} />
                {tab.label}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-md ${
                    active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
          <Scissors className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">خدمتی در این دسته نیست</p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-4 inline-flex items-center gap-2 text-sm text-pink-600 font-semibold hover:underline"
          >
            <Plus className="w-4 h-4" />
            افزودن اولین خدمت
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredServices.map((s) => (
            <div
              key={s.id}
              className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-3 hover:border-pink-200 transition"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-800">{s.name}</span>
                  {!s.is_active && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                      غیرفعال
                    </span>
                  )}
                  {activeTab === 'all' && s.category_id && (
                    <span className="text-xs bg-pink-50 text-pink-700 px-2 py-0.5 rounded-md">
                      {categoryName(s.category_id)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  {s.duration_minutes} دقیقه — {formatPrice(s.price)}
                </p>
                {s.description && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">{s.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(s)}
                  className="inline-flex items-center gap-1 text-sm text-pink-700 hover:bg-pink-50 px-3 py-1.5 rounded-lg"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  ویرایش
                </button>
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  className="inline-flex items-center gap-1 text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ServiceFormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        form={form}
        setForm={setForm}
        editId={editId}
        categories={data.categories}
        onSubmit={save}
        saving={saving}
      />
    </div>
  );
}
