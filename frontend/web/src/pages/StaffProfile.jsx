import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Star,
  CheckCircle2,
  Image as ImageIcon,
  CalendarCheck,
  X,
} from 'lucide-react';
import { api, mediaUrl } from '../../../shared/api';
import portfolio1 from '../assets/defaults/portfolio-1.jpg';
import portfolio2 from '../assets/defaults/portfolio-2.jpg';
import gallery1 from '../assets/defaults/gallery-1.jpg';
import gallery3 from '../assets/defaults/gallery-3.jpg';

// نمونه‌کارهای پیش‌فرض (وقتی پرسنل هنوز نمونه‌کاری ثبت نکرده)
const DEFAULT_PORTFOLIO = [
  { id: -1, url: portfolio1, caption: '' },
  { id: -2, url: portfolio2, caption: '' },
  { id: -3, url: gallery1, caption: '' },
  { id: -4, url: gallery3, caption: '' },
];

export default function StaffProfile({ settings }) {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const primary = settings?.primary_color || '#9d174d';
  const secondary = settings?.secondary_color || '#500724';

  useEffect(() => {
    setLoading(true);
    api(`/staff/${id}`)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-lg mx-auto py-24 text-center px-4">
        <p className="text-stone-600 font-medium">پروفایل یافت نشد</p>
        <Link to="/#team" className="inline-flex mt-4 text-pink-700 font-semibold">
          بازگشت به تیم
        </Link>
      </div>
    );
  }

  const avatarSrc = profile.avatar_url || mediaUrl(profile.avatar_path);
  const portfolio = profile.portfolio?.length ? profile.portfolio : DEFAULT_PORTFOLIO;
  const activeItem = portfolio.find((x) => x.id === activeId) || null;

  return (
    <div className="pb-20">
      <div className="relative overflow-hidden" style={{ backgroundColor: secondary }}>
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,white,transparent_50%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-10">
          <Link
            to="/#team"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-8"
          >
            <ArrowRight className="w-4 h-4" />
            بازگشت به تیم
          </Link>

          <div className="flex flex-col md:flex-row gap-8 items-center md:items-end">
            <div className="relative shrink-0">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt=""
                  className="w-36 h-36 md:w-44 md:h-44 rounded-3xl object-cover border-4 border-white/30 shadow-2xl"
                />
              ) : (
                <div
                  className="w-36 h-36 md:w-44 md:h-44 rounded-3xl flex items-center justify-center text-4xl font-bold text-white border-4 border-white/30"
                  style={{ backgroundColor: profile.color_hex || primary }}
                >
                  {profile.display_name?.charAt(0)}
                </div>
              )}
              <div className="absolute -bottom-3 -left-3 bg-white rounded-2xl px-3 py-2 shadow-xl flex items-center gap-2">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-bold text-stone-800">{profile.satisfaction_percent}% رضایت</span>
              </div>
            </div>

            <div className="flex-1 text-white text-center md:text-right">
              <h1 className="text-3xl md:text-4xl font-bold">{profile.display_name}</h1>
              <p className="text-white/75 mt-2 max-w-xl leading-relaxed">{profile.bio || 'متخصص زیبایی'}</p>
              {settings?.is_booking_enabled == 1 && (
                <Link
                  to={`/book?staff=${profile.id}`}
                  className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-2xl bg-white font-bold shadow-lg hover:shadow-xl transition"
                  style={{ color: primary }}
                >
                  <CalendarCheck className="w-5 h-5" />
                  رزرو با این پرسنل
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {[
            { label: 'خدمت فعال', value: profile.services_count, icon: CheckCircle2 },
            { label: 'نوبت انجام‌شده', value: profile.completed_jobs, icon: CalendarCheck },
            { label: 'رضایت', value: `${profile.satisfaction_percent}%`, icon: Star },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-2xl bg-white border border-stone-200 shadow-lg p-5 text-center">
                <Icon className="w-6 h-6 mx-auto mb-2" style={{ color: primary }} />
                <p className="text-2xl font-bold text-stone-900">{s.value}</p>
                <p className="text-xs text-stone-500 mt-1">{s.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-14 space-y-14">
        {portfolio.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <ImageIcon className="w-6 h-6" style={{ color: primary }} />
              <h2 className="text-2xl font-bold text-stone-900">نمونه کارها</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {portfolio.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className="group rounded-2xl overflow-hidden border border-stone-200 shadow-sm aspect-square relative text-right"
                  aria-label="نمایش نمونه کار"
                >
                  <img
                    src={item.url}
                    alt={item.caption || ''}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  {item.caption ? (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <p className="text-white text-xs line-clamp-2">{item.caption}</p>
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {activeItem && (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setActiveId(null)}
            aria-label="بستن"
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative w-full max-w-4xl rounded-3xl overflow-hidden bg-white shadow-2xl">
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="absolute top-3 left-3 z-10 p-2 rounded-xl bg-white/90 hover:bg-white text-stone-800 shadow"
                aria-label="بستن"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="bg-black">
                <img src={activeItem.url} alt={activeItem.caption || ''} className="w-full max-h-[75vh] object-contain" />
              </div>
              {activeItem.caption ? (
                <div className="p-5">
                  <p className="text-stone-700 leading-relaxed">{activeItem.caption}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
