import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Phone, MapPin, Calendar } from 'lucide-react';
import { getUser, clearAuth, mediaUrl } from '../../../shared/api';
import { getLabels, getVerticalCopy, getVerticalFeatures } from '../../../shared/vertical';

export default function Layout({ settings, children }) {
  const user = getUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const primary = settings.primary_color || '#9d174d';
  const secondary = settings.secondary_color || '#500724';
  const logoUrl = mediaUrl(settings.logo_path);
  const labels = getLabels(settings);
  const copy = getVerticalCopy(settings);
  const vFeatures = getVerticalFeatures(settings);

  const nav = [
    { href: '/#services', label: labels.services },
    { href: '/#team', label: labels.staff },
    ...(vFeatures.gallery ? [{ href: '/#gallery', label: 'گالری' }] : []),
    { href: '/#contact', label: 'تماس' },
  ];

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col" data-business-type={settings.business_type || 'beauty_salon'}>
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
                <a key={n.href} href={n.href} className="hover:opacity-80 transition-colors" style={{ ['--tw-text-opacity']: 1 }}>
                  {n.label}
                </a>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <Link to="/my-appointments" className="text-sm text-stone-600 hover:opacity-80">
                    {labels.appointment}‌های من
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
                <Link to="/login" className="text-sm text-stone-600 hover:opacity-80">
                  ورود
                </Link>
              )}
              {settings.is_booking_enabled == 1 && (
                <Link
                  to="/book"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md hover:shadow-lg transition"
                  style={{ backgroundColor: primary }}
                >
                  <Calendar size={16} />
                  {labels.book_cta}
                </Link>
              )}
            </div>

            <button type="button" className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="منو">
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden mx-4 mt-2 rounded-2xl bg-white border border-stone-200 shadow-lg p-4 space-y-3">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="block py-2 text-stone-700" onClick={() => setMenuOpen(false)}>
                {n.label}
              </a>
            ))}
            {settings.is_booking_enabled == 1 && (
              <Link
                to="/book"
                onClick={() => setMenuOpen(false)}
                className="block text-center py-3 rounded-xl text-white font-semibold"
                style={{ backgroundColor: primary }}
              >
                {labels.book_cta}
              </Link>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 pt-24">{children}</main>

      <footer id="contact" className="mt-auto text-white" style={{ backgroundColor: secondary }}>
        <div className="max-w-7xl mx-auto px-4 py-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-2">{settings.name}</h3>
            <p className="text-white/70 text-sm leading-relaxed">{copy.footer_tagline}</p>
          </div>
          <div className="space-y-2 text-sm text-white/80">
            {settings.phone && (
              <a href={`tel:${settings.phone}`} className="flex items-center gap-2 hover:text-white">
                <Phone size={16} /> {settings.phone}
              </a>
            )}
            {settings.address && (
              <p className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0" /> {settings.address}
              </p>
            )}
          </div>
          <div className="text-sm text-white/60">
            {settings.enamad_code ? (
              <div dangerouslySetInnerHTML={{ __html: settings.enamad_code }} />
            ) : (
              <p>© {new Date().getFullYear()} {settings.name}</p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
