import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';

const TONES = {
  pink: { bar: 'bg-pink-500', iconWrap: 'bg-pink-50 text-pink-600', ring: 'hover:ring-pink-200' },
  amber: { bar: 'bg-amber-500', iconWrap: 'bg-amber-50 text-amber-600', ring: 'hover:ring-amber-200' },
  violet: { bar: 'bg-violet-500', iconWrap: 'bg-violet-50 text-violet-600', ring: 'hover:ring-violet-200' },
  blue: { bar: 'bg-sky-500', iconWrap: 'bg-sky-50 text-sky-600', ring: 'hover:ring-sky-200' },
};

export default function StatCard({ label, value, icon: Icon, tone = 'pink', href, subtitle }) {
  const t = TONES[tone] || TONES.pink;
  const IconComp = Icon || TrendingUp;

  const inner = (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 ring-0 hover:ring-2 ${t.ring} h-full`}
    >
      <div className={`absolute top-0 inset-x-0 h-0.5 ${t.bar}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-slate-500 text-sm font-medium">{label}</p>
          <p className="text-3xl sm:text-4xl font-bold text-slate-900 mt-2 tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${t.iconWrap}`}>
          <IconComp className="w-6 h-6" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );

  return href ? <Link to={href} className="block">{inner}</Link> : inner;
}
