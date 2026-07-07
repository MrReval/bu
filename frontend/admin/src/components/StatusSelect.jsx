import { STATUS_LABELS } from '../../../shared/utils';
import { STATUS_SELECT } from '../../../shared/statusStyles';
import { ChevronDown } from 'lucide-react';

const STATUSES = Object.keys(STATUS_LABELS);

export default function StatusSelect({ value, onChange, disabled, className = '', colored = true }) {
  const style = colored
    ? (STATUS_SELECT[value] || STATUS_SELECT.pending)
    : 'bg-white border-slate-200 text-slate-700 focus:ring-pink-300';

  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none rounded-xl border-2 px-4 py-2.5 pr-10 text-sm font-semibold cursor-pointer focus:outline-none focus:ring-2 transition ${style}`}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-60" />
    </div>
  );
}
