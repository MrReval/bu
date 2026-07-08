import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Star, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../../../shared/api';

export default function Survey() {
  const { id, token } = useParams();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api(`/survey/${id}/${token}`)
      .then((d) => {
        setInfo(d);
        if (d.already_submitted) setDone(true);
      })
      .catch((e) => setError(e.message));
  }, [id, token]);

  const submit = async () => {
    setSending(true);
    try {
      await api(`/survey/${id}/${token}`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment }),
      });
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="bg-white rounded-3xl shadow-sm p-10">
          <p className="text-rose-500 font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-14">
      <div className="bg-white rounded-3xl shadow-sm p-8 text-center">
        {done ? (
          <>
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-xl font-extrabold text-slate-800 mb-2">سپاسگزاریم!</h1>
            <p className="text-slate-500 text-sm leading-7">نظر شما با موفقیت ثبت شد و برای ما ارزشمند است.</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-extrabold text-slate-800 mb-1">نظرسنجی خدمات</h1>
            {info.salon_name && <p className="text-pink-600 font-semibold mb-4">{info.salon_name}</p>}
            <p className="text-slate-500 text-sm mb-6">از خدمات ما چقدر رضایت داشتید؟</p>

            <div className="flex justify-center gap-2 mb-6" dir="ltr">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  className="p-1"
                  aria-label={`${n} ستاره`}
                >
                  <Star
                    className={`w-9 h-9 transition ${
                      n <= (hover || rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            <textarea
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 text-sm mb-4"
              rows={4}
              placeholder="نظر یا پیشنهاد شما (اختیاری)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />

            <button
              onClick={submit}
              disabled={sending}
              className="w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-60 text-white font-bold flex items-center justify-center gap-2"
            >
              {sending && <Loader2 className="w-4 h-4 animate-spin" />}
              ثبت نظر
            </button>
          </>
        )}
      </div>
    </div>
  );
}
