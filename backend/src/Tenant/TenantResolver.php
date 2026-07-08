<?php

declare(strict_types=1);

namespace Salon\Tenant;

use Salon\Config;
use Salon\Database\Connection;

final class TenantResolver
{
    /**
     * تشخیص سایت جاری از روی دامنه.
     * @return string یکی از: 'platform' | 'site' | 'not_found'
     */
    public static function resolve(?string $host): string
    {
        $host = self::normalizeHost($host);

        if ($host === '' ) {
            return 'not_found';
        }

        if ($host === Config::superAdminDomain()) {
            TenantContext::setPlatform();
            return 'platform';
        }

        $pdo = Connection::get();
        $stmt = $pdo->prepare('SELECT * FROM sites WHERE domain = ? LIMIT 1');
        $stmt->execute([$host]);
        $site = $stmt->fetch();

        // تلاش دوباره بدون www
        if (!$site && str_starts_with($host, 'www.')) {
            $bare = substr($host, 4);
            $stmt->execute([$bare]);
            $site = $stmt->fetch();
        }

        if (!$site) {
            return 'not_found';
        }

        TenantContext::setSite($site);
        return 'site';
    }

    public static function normalizeHost(?string $host): string
    {
        $host = strtolower(trim((string) $host));
        // حذف پورت
        if (str_contains($host, ':')) {
            $host = explode(':', $host)[0];
        }
        return $host;
    }

    public static function siteIsActive(): bool
    {
        $site = TenantContext::site();
        if (!$site) {
            return false;
        }
        if (($site['status'] ?? 'active') !== 'active') {
            return false;
        }
        if (!empty($site['expires_at']) && strtotime((string) $site['expires_at']) < time()) {
            return false;
        }
        return true;
    }
}
