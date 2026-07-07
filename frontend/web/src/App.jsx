import { Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../../shared/api';
import Layout from './components/Layout';
import Home from './pages/Home';
import Book from './pages/Book';
import StaffProfile from './pages/StaffProfile';
import Login from './pages/Login';
import MyAppointments from './pages/MyAppointments';

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
    document.body.style.fontFamily = settings.font_family || 'Vazirmatn';
    if (settings.name) document.title = settings.name;
  }, [settings]);

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pink-50">
        <div className="animate-pulse text-pink-600">در حال بارگذاری...</div>
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
      </Routes>
    </Layout>
  );
}
