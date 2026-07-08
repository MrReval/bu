import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Phone, MapPin, Calendar } from 'lucide-react';
import { getUser, clearAuth, mediaUrl } from '../../../shared/api';

export default function Layout({ settings, children }) {
  const user = getUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const primary = settings.primary_color || '#9d174d';
  const secondary = settings.secondary_color || '#500724';
  const logoUrl = mediaUrl(settings.logo_path);

  const nav = [
    { href: '/#services', label: 'خدمات' },
    { href: '/#team', label: 'تیم ما' },
    { href: '/#gallery', label: 'گالری' },
    { href: '/#contact', label: 'تماس' },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="fixed top-0 inset-x-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/90 backdrop-blur-xl border border-stone-200/80 shadow-sm px-5 py-3">
            <Link to="/" className="flex items-center gap-3 min-w-0">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={settings.name || 'لوگو'}
                  className="h-10 w-auto max-w-[148px] object-contain shrink-0"
                />
              ) : (
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0"
                  style={{ backgroundColor: primary }}
                >
                  {settings.name?.charAt(0) || 'س'}
                </span>
              )}
              <span className="font-bold text-lg hidden sm:block truncate" style={{ color: secondary }}>
                {settings.name}
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-600">
              {nav.map((n) => (
                <a key={n.href} href={n.href} className="hover:text-pink-700 transition-colors">
                  {n.label}
                </a>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <Link to="/my-appointments" className="text-sm text-stone-600 hover:text-pink-700">
                    نوبت‌های من
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      clearAuth();
                      window.location.href = '/';
                    }}
                    className="text-sm text-stone-400 hover:text-stone-600"
                  >
                    خروج
                  </button>
                </>
              ) : (
                <Link to="/login" className="text-sm text-stone-600 hover:text-pink-700">
                  ورود
                </Link>
              )}
              {settings.is_booking_enabled == 1 && (
                <Link
                  to="/book"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md hover:shadow-lg transition"
                  style={{ backgroundColor: primary }}
                >
                  <Calendar className="w-4 h-4" />
                  رزرو نوبت
                </Link>
              )}
            </div>

            <button
              type="button"
              className="md:hidden p-2 text-stone-600 rounded-lg hover:bg-stone-100"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="منو"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden mx-4 mt-2 p-4 rounded-2xl bg-white border border-stone-200 shadow-xl space-y-3">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-stone-700 font-medium"
              >
                {n.label}
              </a>
            ))}
            <Link
              to="/book"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold"
              style={{ backgroundColor: primary }}
            >
              <Calendar className="w-4 h-4" />
              رزرو نوبت
            </Link>
          </div>
        )}
      </header>

      <main className="pt-24">{children}</main>

      <footer id="contact" className="text-white" style={{ backgroundColor: secondary }}>
        <div className="max-w-7xl mx-auto px-4 py-16 grid md:grid-cols-3 gap-10">
          <div>
            {logoUrl ? (
              <div className="inline-flex bg-white/95 rounded-xl px-3 py-2 mb-3">
                <img src={logoUrl} alt={settings.name} className="h-8 w-auto max-w-[140px] object-contain" />
              </div>
            ) : (
              <h3 className="text-xl font-bold mb-3">{settings.name}</h3>
            )}
            <p className="text-white/75 text-sm leading-relaxed">
              زیبایی شما، تخصص ما. با بهترین متریال و تیم حرفه‌ای در خدمت شما هستیم.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">دسترسی سریع</h4>
            <ul className="space-y-2 text-sm text-white/75">
              <li>
                <Link to="/book" className="hover:text-white transition">
                  رزرو آنلاین
                </Link>
              </li>
              <li>
                <a href="/#services" className="hover:text-white transition">
                  خدمات
                </a>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition">
                  ورود مشتری
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">تماس</h4>
            {settings.phone && (
              <p className="text-white/75 text-sm mb-2 flex items-center gap-2" dir="ltr">
                <Phone className="w-4 h-4 shrink-0" />
                {settings.phone}
              </p>
            )}
            {settings.address && (
              <p className="text-white/75 text-sm flex items-start gap-2">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                {settings.address}
              </p>
            )}
          </div>
        </div>
        {settings.enamad_code && (
          <div className="border-t border-white/10 flex justify-center py-6">
            <div
              className="bg-white/95 rounded-xl p-2 inline-flex items-center [&_img]:h-auto [&_img]:max-h-24 [&_img]:w-auto"
              dangerouslySetInnerHTML={{ __html: settings.enamad_code }}
            />
          </div>
        )}
        <div className="border-t border-white/10 text-center py-4 text-xs text-white/50">
          © {new Date().getFullYear()} {settings.name}
        </div>
      </footer>
    </div>
  );
}
