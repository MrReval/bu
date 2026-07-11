import { Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../../shared/api';
import Layout from './components/Layout';
import Home from './pages/Home';
import Book from './pages/Book';
import StaffProfile from './pages/StaffProfile';
import Login from './pages/Login';
import MyAppointments from './pages/MyAppointments';
import Survey from './pages/Survey';

export default function App() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api('/settings/public').then(setSettings).catch(console.error);
  }, []);

  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    root.style.setProperty('--color-primary', settings.primary_color);
    root.style.setProperty('--color-secondary', settings.secondary_color);
    root.style.setProperty('--color-accent', settings.accent_color);
    root.dataset.businessType = settings.business_type || 'beauty_salon';
    document.body.style.fontFamily = settings.font_family || 'Vazirmatn';
    if (settings.name) document.title = settings.name;
  }, [settings]);

  // فعال‌سازی PWA در صورت فعال‌بودن فیچر برای این سایت
  useEffect(() => {
    if (!settings || !(settings.features || []).includes('pwa')) return;

    let link = document.querySelector('link[rel="manifest"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    link.href = '/manifest.webmanifest';

    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = settings.primary_color || '#9d174d';

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, [settings]);

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="animate-pulse text-stone-500">در حال بارگذاری...</div>
      </div>
    );
  }

  return (
    <Layout settings={settings}>
      <Routes>
        <Route path="/" element={<Home settings={settings} />} />
        <Route path="/team/:id" element={<StaffProfile settings={settings} />} />
        <Route path="/book" element={<Book settings={settings} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/my-appointments" element={<MyAppointments />} />
        <Route path="/survey/:id/:token" element={<Survey />} />
      </Routes>
    </Layout>
  );
}
