import { useEffect, useState } from 'react';
import { Star, MessageSquareText } from 'lucide-react';
import { api } from '../../../shared/api';
import { formatJalaliDate, toPersianDigits } from '../../../shared/jalali';
import { useToast } from '../context/Toast';

function Stars({ n }) {
  return (
    <span className="inline-flex" dir="ltr">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-4 h-4 ${i <= n ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
      ))}
    </span>
  );
}

export default function Surveys() {
  const [data, setData] = useState(null);
  const toast = useToast();

  useEffect(() => {
    api('/admin/surveys')
      .then(setData)
      .catch((e) => toast.show(e.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Star className="w-6 h-6 text-pink-600" />
        <h1 className="text-2xl font-extrabold text-slate-800">نظرسنجی‌ها</h1>
      </div>

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 mb-6">
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <p className="text-xs text-slate-400 mb-1">میانگین رضایت</p>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-extrabold text-slate-800">{toPersianDigits(data.average)}</span>
                <Stars n={Math.round(data.average)} />
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <p className="text-xs text-slate-400 mb-1">تعداد نظرات ثبت‌شده</p>
              <span className="text-3xl font-extrabold text-slate-800">{toPersianDigits(data.count)}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            {data.responses.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <MessageSquareText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                هنوز نظری ثبت نشده است.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.responses.map((r) => (
                  <li key={r.id} className="py-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-700">{r.customer_name || 'مشتری'}</span>
                        <Stars n={r.rating} />
                      </div>
                      <span className="text-xs text-slate-400">{formatJalaliDate(r.created_at)}</span>
                    </div>
                    {r.comment && <p className="text-sm text-slate-600 leading-7">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
