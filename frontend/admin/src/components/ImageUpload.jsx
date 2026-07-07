import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { mediaUrl, uploadApi } from '../../../shared/api';

export default function ImageUpload({
  label,
  value,
  previewUrl,
  uploadPath,
  onChange,
  onClear,
  variant = 'square',
  className = '',
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const src = previewUrl || mediaUrl(value);
  const previewClass =
    variant === 'logo'
      ? 'w-40 h-16 rounded-xl object-contain border border-slate-200 bg-white shadow-sm p-1'
      : 'w-32 h-32 rounded-2xl object-cover border border-slate-200 shadow-sm';

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    setUploading(true);
    try {
      const data = await uploadApi(uploadPath, fd);
      onChange?.(data);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-slate-500 mb-2">{label}</label>}
      <div className="flex flex-wrap items-start gap-4">
        {src ? (
          <div className="relative group">
            <img src={src} alt="" className={previewClass} />
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                className="absolute top-2 left-2 p-1.5 rounded-lg bg-white/90 text-red-600 shadow opacity-0 group-hover:opacity-100 transition"
                title="حذف"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className={`${previewClass} border-2 border-dashed flex items-center justify-center text-slate-400 bg-slate-50`}>
            <ImagePlus className="w-8 h-8" />
          </div>
        )}
        <div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            {uploading ? 'در حال آپلود...' : src ? 'تغییر تصویر' : 'انتخاب و آپلود'}
          </button>
          <p className="text-xs text-slate-400 mt-2">JPG، PNG یا WebP — حداکثر ۵ مگابایت</p>
        </div>
      </div>
    </div>
  );
}
