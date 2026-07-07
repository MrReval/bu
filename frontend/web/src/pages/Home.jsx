import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Award,
  Clock,
  Gem,
  Star,
  ChevronDown,
  ArrowLeft,
  Timer,
  CalendarCheck,
  Quote,
  Scissors,
  CheckCircle2,
} from 'lucide-react';
import { api, formatPrice, mediaUrl } from '../../../shared/api';
import { DAY_NAMES, getBusinessDayHours, normalizeBusinessHours, parseJson } from '../../../shared/utils';
import { getCategoryIconComponent } from '../../../shared/categoryIcons';

const DEFAULT_TESTIMONIALS = [
  { name: 'سارا م.', text: 'بهترین مانیکور عمرم! محیط تمیز و برخورد عالی.', stars: 5 },
  { name: 'نیلوفر ک.', text: 'کاشت ناخنم فوق‌العاده شد. حتماً دوباره میام.', stars: 5 },
  { name: 'مریم ر.', text: 'رزرو آنلاین راحت بود و سر وقت نوبتم رو گرفتن.', stars: 5 },
];


const FEATURES = [
  { icon: Award, title: 'کیفیت برتر', desc: 'استفاده از بهترین برندهای بین‌المللی' },
  { icon: Clock, title: 'رزرو آسان', desc: 'نوبت‌دهی آنلاین ۲۴ ساعته' },
  { icon: Gem, title: 'محیط لوکس', desc: 'فضایی آرام و بهداشتی برای آرامش شما' },
];

function CategoryIcon({ name, className = 'w-6 h-6' }) {
  const Icon = getCategoryIconComponent(name);
  return <Icon className={className} strokeWidth={2} />;
}

export default function Home({ settings }) {
  const [sections, setSections] = useState([]);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [team, setTeam] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [activeCat, setActiveCat] = useState('all');

  const primary = settings.primary_color || '#9d174d';
  const secondary = settings.secondary_color || '#500724';
  const accent = settings.accent_color || '#f9a8d4';
  const hours = normalizeBusinessHours(parseJson(settings.business_hours_json, {}));

  useEffect(() => {
    api('/landing/sections').then(setSections).catch(() => {});
    api('/services').then((d) => {
      setCategories((d.categories || []).filter((c) => Number(c.is_active) === 1));
      setServices(d.services || []);
    });
    api('/staff').then(setTeam).catch(() => {});
    api('/gallery').then(setGallery).catch(() => setGallery([]));
  }, []);

  const sectionConfig = (type) => sections.find((s) => s.type === type)?.config || {};

  const filteredServices = useMemo(() => {
    const active = services.filter((s) => s.is_active);
    if (activeCat === 'all') return active;
    return active.filter((s) => String(s.category_id) === String(activeCat));
  }, [services, activeCat]);

  const galleryImages = gallery.length > 0 ? gallery.map((g) => g.url) : [];

  const heroImage =
    mediaUrl(settings.hero_image) ||
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=85';

  const testimonials = sectionConfig('testimonials').items?.length
    ? sectionConfig('testimonials').items
    : DEFAULT_TESTIMONIALS;

  return (
    <div>
      <section className="relative min-h-[92svh] flex items-center overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundColor: primary }} />
        {/* موبایل: عکس هِرو به عنوان پس‌زمینه (بدون شلوغی) */}
        <div
          className="absolute inset-0 lg:hidden bg-cover bg-center opacity-35"
          style={{ backgroundImage: `url('${heroImage}')` }}
        />
        <div className="absolute inset-0 lg:hidden bg-gradient-to-b from-black/45 via-black/35 to-black/55" />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15 hidden lg:block"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1920&q=80')",
          }}
        />
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-25 hidden lg:block"
          style={{ backgroundColor: accent }}
        />
        <div
          className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-25 hidden lg:block"
          style={{ backgroundColor: accent }}
        />

        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-20 lg:py-28 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center w-full">
          <div className="text-white animate-fade-up min-w-0">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-white/25 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              سالن زیبایی لوکس
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold leading-[1.15] mb-6 tracking-tight">
              {settings.hero_title}
            </h1>
            <p className="text-base sm:text-lg text-white/90 leading-relaxed mb-8 sm:mb-10 max-w-xl">
              {settings.hero_subtitle}
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              {settings.is_booking_enabled == 1 && (
                <Link
                  to="/book"
                  className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-8 py-4 rounded-2xl bg-white font-bold shadow-xl hover:shadow-2xl transition"
                  style={{ color: primary }}
                >
                  <CalendarCheck className="w-5 h-5" />
                  رزرو آنلاین نوبت
                </Link>
              )}
              <a
                href="#services"
                className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-8 py-4 rounded-2xl border-2 border-white/40 font-semibold hover:bg-white/10 transition"
              >
                مشاهده خدمات
              </a>
            </div>
            <div className="grid grid-cols-3 gap-4 sm:gap-6 mt-10 sm:mt-14 pt-6 sm:pt-8 border-t border-white/20 max-w-md">
              {[
                { n: '۵۰۰+', l: 'مشتری راضی' },
                { n: '۱۰+', l: 'سال تجربه' },
                { n: '۱۵+', l: 'خدمت تخصصی' },
              ].map((s) => (
                <div key={s.l}>
                  <div className="text-xl sm:text-2xl font-bold leading-tight">{s.n}</div>
                  <div className="text-white/75 text-xs sm:text-sm mt-0.5 leading-snug">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:block animate-fade-up-delay">
            <div className="relative">
              <img
                src={heroImage}
                alt=""
                className="relative rounded-[2rem] shadow-2xl w-full max-w-md mx-auto aspect-[4/5] object-cover border-4 border-white/25"
              />
              <div className="absolute -bottom-4 right-1/2 translate-x-1/2 lg:translate-x-0 lg:right-auto lg:-right-5 bg-white rounded-2xl px-5 py-4 shadow-2xl flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${primary}15`, color: primary }}
                >
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-stone-500">امتیاز مشتریان</p>
                  <p className="text-xl font-bold text-stone-900">۴.۹ از ۵</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <a
          href="#services"
          className="absolute bottom-5 sm:bottom-8 left-1/2 -translate-x-1/2 text-white/60 hover:text-white transition"
          aria-label="اسکرول"
        >
          <ChevronDown className="w-7 h-7 animate-bounce" />
        </a>
      </section>

      <section className="py-16 bg-white border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 grid sm:grid-cols-3 gap-6">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="flex flex-col items-center text-center p-8 rounded-3xl border border-stone-100 bg-stone-50/50 hover:border-pink-200 hover:bg-white transition"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 text-white shadow-lg"
                  style={{ backgroundColor: primary }}
                >
                  <Icon className="w-7 h-7" strokeWidth={1.75} />
                </div>
                <h3 className="font-bold text-lg text-stone-900 mb-2">{f.title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="services" className="py-24 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <span
              className="inline-flex items-center gap-1.5 text-sm font-semibold tracking-wide"
              style={{ color: primary }}
            >
              <Sparkles className="w-4 h-4" />
              خدمات ما
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3 text-stone-900">
              {sectionConfig('services').title || 'خدمات تخصصی زیبایی'}
            </h2>
            <p className="text-stone-500 mt-3 max-w-xl mx-auto">
              ناخن، مو، پوست، میک‌آپ، مژه، اصلاح و میکروبلیدینگ — همه در یک جا
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-12">
            <button
              type="button"
              onClick={() => setActiveCat('all')}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition ${
                activeCat === 'all'
                  ? 'text-white shadow-md'
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-pink-300'
              }`}
              style={activeCat === 'all' ? { backgroundColor: primary } : {}}
            >
              همه
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCat(String(c.id))}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition inline-flex items-center gap-2 ${
                  activeCat === String(c.id)
                    ? 'text-white shadow-md'
                    : 'bg-white text-stone-600 border border-stone-200 hover:border-pink-300'
                }`}
                style={activeCat === String(c.id) ? { backgroundColor: primary } : {}}
              >
                <CategoryIcon name={c.name} className="w-4 h-4" />
                {c.name}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((s) => {
              const catName =
                categories.find((c) => Number(c.id) === Number(s.category_id))?.name || '';
              return (
                <article key={s.id} className="salon-card p-0 overflow-hidden group">
                  <div
                    className="h-36 flex items-center justify-center"
                    style={{ backgroundColor: `${primary}12` }}
                  >
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: 'white', color: primary }}
                    >
                      <CategoryIcon name={catName} className="w-8 h-8" />
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-xl text-stone-900 mb-2">{s.name}</h3>
                    <p className="text-stone-500 text-sm mb-4 line-clamp-2">
                      {s.description || 'خدمت حرفه‌ای با بهترین کیفیت'}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                      <span className="text-xs text-stone-400 inline-flex items-center gap-1">
                        <Timer className="w-3.5 h-3.5" />
                        {s.duration_minutes} دقیقه
                      </span>
                      <span className="font-bold text-lg" style={{ color: primary }}>
                        {formatPrice(s.price)}
                      </span>
                    </div>
                    {settings.is_booking_enabled == 1 && (
                      <Link
                        to="/book"
                        className="mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: primary }}
                      >
                        رزرو این خدمت
                        <ArrowLeft className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative order-2 lg:order-1">
            <img
              src="https://up.20script.ir/file/19a0-d7288fb0e26e335b716071de43c3bf61.jpg"
              alt=""
              className="rounded-3xl shadow-xl w-full aspect-square object-cover"
            />
            <div
              className="absolute -z-10 -bottom-5 -left-5 w-full h-full rounded-3xl"
              style={{ backgroundColor: `${primary}18` }}
            />
          </div>
          <div className="order-1 lg:order-2">
            <span className="text-sm font-semibold" style={{ color: primary }}>
              {sectionConfig('about').title || 'درباره ما'}
            </span>
            <h2 className="text-3xl font-bold mt-2 mb-6 text-stone-900">داستان سالن ما</h2>
            <div
              className="text-stone-600 leading-loose prose prose-pink max-w-none"
              dangerouslySetInnerHTML={{
                __html:
                  settings.about_html ||
                  '<p>ما با عشق به زیبایی و سال‌ها تجربه، فضایی ساخته‌ایم که در آن هر مشتری احساس خاص بودن کند.</p>',
              }}
            />
            <Link
              to="/book"
              className="inline-flex mt-8 items-center gap-2 px-7 py-3.5 rounded-2xl text-white font-semibold shadow-lg hover:shadow-xl transition"
              style={{ backgroundColor: primary }}
            >
              همین حالا نوبت بگیرید
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {team.length > 0 && (
        <section id="team" className="py-24 bg-stone-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-stone-900">تیم حرفه‌ای ما</h2>
              <p className="text-stone-500 mt-2">با هر متخصص آشنا شوید و نمونه کارها را ببینید</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {team.map((m) => (
                <Link
                  key={m.id}
                  to={`/team/${m.id}`}
                  className="group block rounded-3xl bg-white border border-stone-200 shadow-sm hover:shadow-xl hover:border-pink-200 transition overflow-hidden"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                    {m.avatar_url ? (
                      <img
                        src={m.avatar_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-4xl font-bold text-white"
                        style={{ backgroundColor: m.color_hex || primary }}
                      >
                        {m.display_name?.charAt(0)}
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-xl px-2.5 py-1 text-xs font-bold text-amber-700 flex items-center gap-1 shadow">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {m.satisfaction_percent}%
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-stone-900 group-hover:text-pink-700 transition">
                      {m.display_name}
                    </h3>
                    <p className="text-stone-500 text-sm mt-1 line-clamp-2">{m.bio || 'متخصص زیبایی'}</p>
                    <div className="flex flex-wrap gap-3 mt-4 text-xs text-stone-600">
                      <span className="inline-flex items-center gap-1 bg-pink-50 text-pink-800 px-2 py-1 rounded-lg">
                        <Scissors className="w-3.5 h-3.5" />
                        {m.services_count} خدمت
                      </span>
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {m.completed_jobs} نوبت
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {galleryImages.length > 0 && (
        <section id="gallery" className="py-24 bg-stone-50">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-stone-900">گالری کارها</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {galleryImages.slice(0, 6).map((src, i) => (
                <div
                  key={i}
                  className={`overflow-hidden rounded-2xl ${i === 0 ? 'md:row-span-2' : ''}`}
                >
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full min-h-[200px] object-cover hover:scale-105 transition duration-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-stone-900">نظر مشتریان</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="salon-card p-8 relative">
                <Quote
                  className="w-10 h-10 absolute top-6 left-6 opacity-10"
                  style={{ color: primary }}
                />
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars || 5 }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-stone-600 leading-relaxed mb-6 relative z-10">«{t.text}»</p>
                <p className="font-semibold text-stone-800">{t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-stone-100">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8 text-stone-900">ساعات کاری</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 divide-y divide-stone-100">
            {DAY_NAMES.map((name, i) => {
              const day = hours[String(i)] || hours[i] || {};
              const { closed, label } = getBusinessDayHours(day);
              return (
                <div key={i} className="flex justify-between px-6 py-4 text-sm">
                  <span className="font-medium text-stone-800">{name}</span>
                  <span className={closed ? 'text-red-500 font-medium' : 'text-stone-500'}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div
          className="max-w-4xl mx-auto rounded-[2rem] p-12 sm:p-16 text-center text-white shadow-2xl"
          style={{ backgroundColor: primary }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {sectionConfig('cta').title || 'آماده‌اید زیباتر شوید؟'}
          </h2>
          <p className="text-white/85 mb-8 max-w-lg mx-auto">
            همین الان نوبت خود را رزرو کنید و از تخفیف اولین مراجعه بهره‌مند شوید
          </p>
          <Link
            to={sectionConfig('cta').button_link || '/book'}
            className="inline-flex items-center gap-2 px-10 py-4 bg-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition"
            style={{ color: primary }}
          >
            <CalendarCheck className="w-5 h-5" />
            {sectionConfig('cta').button_text || 'رزرو آنلاین'}
          </Link>
        </div>
      </section>
    </div>
  );
}
