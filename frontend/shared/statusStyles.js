import { STATUS_LABELS } from './utils.js';

export const STATUS_SELECT = {
  pending: 'bg-amber-50 border-amber-300 text-amber-900 focus:ring-amber-400',
  confirmed: 'bg-emerald-50 border-emerald-300 text-emerald-900 focus:ring-emerald-400',
  in_progress: 'bg-sky-50 border-sky-300 text-sky-900 focus:ring-sky-400',
  completed: 'bg-slate-100 border-slate-300 text-slate-800 focus:ring-slate-400',
  cancelled: 'bg-red-50 border-red-300 text-red-900 focus:ring-red-400',
  no_show: 'bg-gray-100 border-gray-300 text-gray-700 focus:ring-gray-400',
};

export const STATUS_OPTIONS = Object.keys(STATUS_LABELS).map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));
