import { useEffect, useState } from 'react';
import {
  Activity, Server, Database, HardDrive, Cpu, MessageSquare,
  AlertOctagon, RefreshCw, Trash2,
} from 'lucide-react';
import { api } from '../api';
import { useToast } from '../context/Toast';

const fa = (n) => new Intl.NumberFormat('fa-IR').format(n || 0);

function bytes(n) {
  if (!n) return '۰';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = Number(n);
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(v)} ${u[i]}`;
}

function dateTime(d) {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(d));
  } catch {
    return d;
  }
}

const levelStyle = {
  error: 'bg-rose-50 text-rose-700',
  warning: 'bg-amber-50 text-amber-700',
  info: 'bg-sky-50 text-sky-700',
};

function Stat({ icon: Icon, label, value, tone = 'bg-slate-100 text-slate-600' }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tone}`}><Icon size={20} /></div>
      <div className="min-w-0">
        <div className="text-xs text-slate-400">{label}</div>
        <div className="font-bold text-slate-800 truncate" dir="ltr">{value}</div>
      </div>
    </div>
  );
}

export default function Monitoring() {
  const [sys, setSys] = useState(null);
  const [logs, setLogs] = useState([]);
  const [level, setLevel] = useState('');
  const { show } = useToast();

  const loadSys = () => api('/system').then(setSys).catch((e) => show(e.message, 'error'));
  const loadLogs = (lv = level) =>
    api(`/logs?limit=200${lv ? `&level=${lv}` : ''}`).then((d) => setLogs(d.logs || [])).catch((e) => show(e.message, 'error'));

  useEffect(() => {
    loadSys();
    loadLogs('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filterLevel = (lv) => { setLevel(lv); loadLogs(lv); };

  const clear = async () => {
    if (!window.confirm('همه‌ی لاگ‌ها پاک شوند؟')) return;
    try {
      await api('/logs', { method: 'DELETE', body: JSON.stringify({}) });
      show('لاگ‌ها پاک شد');
      loadLogs();
      loadSys();
    } catch (e) {
      show(e.message, 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Activity className="text-brand-600" />
        <h1 className="text-2xl font-extrabold text-slate-800">مانیتورینگ سیستم</h1>
      </div>

      {sys && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Stat icon={Server} label="نسخه PHP" value={sys.php_version} tone="bg-indigo-100 text-indigo-600" />
          <Stat icon={Database} label="نسخه MySQL" value={sys.mysql_version || '—'} tone="bg-emerald-100 text-emerald-600" />
          <Stat icon={HardDrive} label="فضای آزاد دیسک" value={`${bytes(sys.disk_free)} / ${bytes(sys.disk_total)}`} tone="bg-sky-100 text-sky-600" />
          <Stat icon={Cpu} label="مصرف حافظه" value={bytes(sys.memory_usage)} tone="bg-fuchsia-100 text-fuchsia-600" />
          <Stat icon={MessageSquare} label="پیامک موفق (۲۴ساعت)" value={fa(sys.sms_sent_24h)} tone="bg-teal-100 text-teal-600" />
          <Stat icon={MessageSquare} label="پیامک ناموفق (۲۴ساعت)" value={fa(sys.sms_failed_24h)} tone="bg-amber-100 text-amber-600" />
          <Stat icon={AlertOctagon} label="خطاها (۲۴ساعت)" value={fa(sys.errors_24h)} tone="bg-rose-100 text-rose-600" />
          <Stat icon={Activity} label="کل لاگ‌ها" value={fa(sys.logs_total)} tone="bg-slate-100 text-slate-600" />
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <span className="font-bold text-slate-700">لاگ فنی</span>
          <div className="flex flex-wrap items-center gap-2">
            {[['', 'همه'], ['error', 'خطا'], ['warning', 'هشدار'], ['info', 'اطلاع']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => filterLevel(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${level === v ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {l}
              </button>
            ))}
            <button onClick={() => { loadLogs(); loadSys(); }} className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200" title="بازخوانی">
              <RefreshCw size={15} />
            </button>
            <button onClick={clear} className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100" title="پاک‌سازی">
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        <div className="max-h-[32rem] overflow-y-auto divide-y divide-slate-50">
          {logs.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-400 text-sm">لاگی ثبت نشده است</div>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${levelStyle[l.level] || 'bg-slate-100 text-slate-600'}`}>{l.level}</span>
                    <span className="text-[11px] text-slate-400">{l.channel}</span>
                    {l.site_name && <span className="text-[11px] text-brand-600 truncate">{l.site_name}</span>}
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">{dateTime(l.created_at)}</span>
                </div>
                <div className="text-sm text-slate-700 break-words">{l.message}</div>
                {(l.path || l.context?.file) && (
                  <div className="text-[11px] text-slate-400 mt-0.5" dir="ltr">
                    {l.path}{l.context?.file ? ` — ${l.context.file}` : ''}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
