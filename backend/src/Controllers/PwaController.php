<?php

declare(strict_types=1);

namespace Salon\Controllers;

use Salon\Database\Connection;
use Salon\Tenant\FeatureGate;
use Salon\Tenant\TenantContext;

/**
 * سرویس‌دهی manifest و service worker برای تبدیل سایت به PWA.
 */
final class PwaController
{
    public static function manifest(): void
    {
        $sid = TenantContext::siteId();
        $stmt = Connection::get()->prepare(
            'SELECT name, primary_color, logo_path FROM salon_settings WHERE site_id = ?'
        );
        $stmt->execute([$sid]);
        $s = $stmt->fetch() ?: [];

        $name = (string) ($s['name'] ?? 'سالن زیبایی');
        $color = (string) ($s['primary_color'] ?? '#9d174d');
        $icons = [];
        if (!empty($s['logo_path'])) {
            $logo = (string) $s['logo_path'];
            foreach (['192x192', '512x512'] as $size) {
                $icons[] = ['src' => $logo, 'sizes' => $size, 'type' => 'image/png', 'purpose' => 'any maskable'];
            }
        }

        $manifest = [
            'name' => $name,
            'short_name' => mb_substr($name, 0, 12),
            'start_url' => '/',
            'scope' => '/',
            'display' => 'standalone',
            'orientation' => 'portrait',
            'background_color' => '#ffffff',
            'theme_color' => $color,
            'lang' => 'fa',
            'dir' => 'rtl',
            'icons' => $icons,
        ];

        header('Content-Type: application/manifest+json; charset=utf-8');
        header('Cache-Control: public, max-age=3600');
        echo json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    public static function serviceWorker(): void
    {
        header('Content-Type: application/javascript; charset=utf-8');
        header('Service-Worker-Allowed: /');
        header('Cache-Control: no-cache');
        echo <<<'JS'
const CACHE = 'salon-pwa-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/uploads')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const network = fetch(req).then((res) => {
      if (res && res.status === 200) cache.put(req, res.clone());
      return res;
    }).catch(() => cached);
    return cached || network;
  })());
});
JS;
    }

    /** آیا PWA برای سایت جاری فعال است */
    public static function enabled(): bool
    {
        return FeatureGate::has('pwa');
    }
}
