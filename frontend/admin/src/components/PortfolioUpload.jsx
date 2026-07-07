import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, Save } from 'lucide-react';
import { api, uploadApi } from '../../../shared/api';
import { useToast } from '../context/Toast';

export default function PortfolioUpload({ staffId, multilineCaption = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [captions, setCaptions] = useState({});
  const inputRef = useRef(null);
  const toast = useToast();

  const load = () => {
    if (!staffId) return;
    setLoading(true);
    api(`/admin/staff/${staffId}/portfolio`)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setItems(list);
        setCaptions((prev) => {
          const next = { ...prev };
          for (const it of list) {
            if (next[it.id] === undefined) next[it.id] = it.caption || '';
          }
          return next;
        });
      })
      .catch((e) => toast.show(e.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [staffId]);

  const captionChanged = useMemo(() => {
    const map = new Map(items.map((it) => [it.id, it.caption || '']));
    return (id) => (captions[id] ?? '') !== (map.get(id) ?? '');
  }, [items, captions]);

  const onFile = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !staffId) return;
    setUploading(true);
    let added = 0;
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('image', file);
        await uploadApi(`/admin/staff/${staffId}/portfolio`, fd);
        added += 1;
      }
      toast.show(added > 1 ? `${added} نمونه کار اضافه شد` : 'نمونه کار اضافه شد');
      load();
    } catch (err) {
      toast.show(err.message, 'error');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (id) => {
    if (!confirm('این نمونه کار حذف شود؟')) return;
    try {
      await api(`/admin/staff/${staffId}/portfolio/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((x) => x.id !== id));
      setCaptions((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.show('حذف شد');
    } catch (err) {
      toast.show(err.message, 'error');
    }
  };

  const saveCaption = async (id) => {
    const caption = (captions[id] ?? '').trim();
    setSavingId(id);
    try {
      await api(`/admin/staff/${staffId}/portfolio/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ caption }),
      });
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, caption } : it)));
      toast.show('توضیحات ذخیره شد');
    } catch (err) {
      toast.show(err.message, 'error');
    } finally {
      setSavingId(null);
    }
  };

  if (!staffId) {
    return <p className="text-sm text-slate-500">پس از ذخیره پرسنل می‌توانید نمونه کار آپلود کنید.</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-xs font-medium text-slate-500">نمونه کارها</p>
        <div>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFile} />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1 text-xs font-semibold text-pink-700 hover:bg-pink-50 px-3 py-1.5 rounded-lg"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
            افزودن
          </button>
        </div>
      </div>
      {loading ? (
        <div className="h-20 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-pink-600" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-xl">
          هنوز نمونه کاری نیست
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="relative group aspect-[4/3] overflow-hidden">
                <img src={item.url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="absolute top-2 left-2 p-2 rounded-xl bg-white/95 text-red-600 shadow opacity-0 group-hover:opacity-100 transition"
                  title="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 space-y-2">
                {multilineCaption ? (
                  <textarea
                    value={captions[item.id] ?? ''}
                    onChange={(e) => setCaptions((p) => ({ ...p, [item.id]: e.target.value }))}
                    placeholder="توضیحات نمونه‌کار (اختیاری) — می‌توانید چند خط بنویسید"
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-y min-h-[72px] focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400"
                  />
                ) : (
                  <input
                    value={captions[item.id] ?? ''}
                    onChange={(e) => setCaptions((p) => ({ ...p, [item.id]: e.target.value }))}
                    placeholder="توضیحات نمونه‌کار (اختیاری)"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400"
                  />
                )}
                <button
                  type="button"
                  disabled={savingId === item.id || !captionChanged(item.id)}
                  onClick={() => saveCaption(item.id)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50"
                  title="ذخیره"
                >
                  {savingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  ذخیره توضیحات
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
