import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, Images } from 'lucide-react';
import { api, uploadApi } from '../../../shared/api';
import { useToast } from '../context/Toast';

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    api('/admin/gallery')
      .then((data) => {
        const next = Array.isArray(data) ? data : [];
        if (!Array.isArray(data)) {
          toast.show('پاسخ گالری نامعتبر است (JSON آرایه نیست)', 'error');
        }
        setItems(next);
      })
      .catch((e) => toast.show(e.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const onUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('image', file);
        await uploadApi('/admin/gallery', fd);
      }
      toast.show('تصاویر گالری اضافه شد');
      load();
    } catch (err) {
      toast.show(err.message, 'error');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (id) => {
    if (!confirm('این تصویر از گالری حذف شود؟')) return;
    try {
      await api(`/admin/gallery/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast.show('حذف شد');
    } catch (err) {
      toast.show(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Images className="w-7 h-7 text-pink-600" />
            گالری سایت
          </h1>
          <p className="text-slate-500 text-sm mt-1">تصاویر نمایش داده‌شده در صفحه اصلی وب‌سایت</p>
        </div>
        <div>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm disabled:opacity-60"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            آپلود تصویر
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
          <Images className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-700">گالری خالی است</p>
          <p className="text-sm text-slate-500 mt-1">اولین تصویر را آپلود کنید</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
              <img src={item.url} alt="" className="w-full aspect-square object-cover" />
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="absolute top-2 left-2 p-2 rounded-xl bg-white/95 text-red-600 shadow opacity-0 group-hover:opacity-100 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
