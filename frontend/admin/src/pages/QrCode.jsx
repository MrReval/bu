import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode as QrIcon, Download, Link as LinkIcon } from 'lucide-react';
import { useToast } from '../context/Toast';

const origin = typeof window !== 'undefined' ? window.location.origin : '';

const TARGETS = [
  { key: 'home', label: 'صفحه اصلی سایت', url: origin + '/' },
  { key: 'book', label: 'رزرو نوبت آنلاین', url: origin + '/book' },
];

export default function QrCode() {
  const [target, setTarget] = useState('home');
  const [color, setColor] = useState('#9d174d');
  const canvasRef = useRef(null);
  const toast = useToast();

  const current = TARGETS.find((t) => t.key === target) || TARGETS[0];

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, current.url, {
      width: 320,
      margin: 2,
      color: { dark: color, light: '#ffffff' },
      errorCorrectionLevel: 'H',
    }).catch(() => {});
  }, [current.url, color]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `qr-${target}.png`;
    a.click();
    toast.show('QR کد دانلود شد');
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <QrIcon className="w-6 h-6 text-pink-600" />
        <h1 className="text-2xl font-extrabold text-slate-800">QR کد اختصاصی</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 grid gap-8 md:grid-cols-2">
        <div className="space-y-5">
          <div>
            <label className="block text-sm text-slate-600 mb-2">مقصد QR</label>
            <div className="space-y-2">
              {TARGETS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTarget(t.key)}
                  className={`w-full text-right px-4 py-3 rounded-xl border transition ${
                    target === t.key ? 'border-pink-500 bg-pink-50' : 'border-slate-200 hover:border-pink-300'
                  }`}
                >
                  <div className="font-medium text-slate-700 text-sm">{t.label}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5" dir="ltr">
                    <LinkIcon className="w-3 h-3" /> {t.url}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-2">رنگ QR</label>
            <div className="flex items-center gap-3">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer" />
              <span className="text-sm text-slate-500" dir="ltr">{color}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <canvas ref={canvasRef} />
          </div>
          <button
            onClick={download}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-bold"
          >
            <Download size={16} /> دانلود PNG
          </button>
        </div>
      </div>
    </div>
  );
}
