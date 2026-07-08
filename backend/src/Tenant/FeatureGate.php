<?php

declare(strict_types=1);

namespace Salon\Tenant;

use Salon\Database\Connection;
use Salon\Http\Response;

/**
 * کنترل دسترسی به قابلیت‌ها بر اساس پکیج اشتراک سایت.
 * اگر سایت پکیجی نداشته باشد، همه قابلیت‌ها فعال در نظر گرفته می‌شوند.
 */
final class FeatureGate
{
    /** @var array<int,string[]>|null */
    private static ?array $cache = null;

    /** @return string[] کلید قابلیت‌های فعال برای سایت جاری */
    public static function enabledKeys(?int $siteId = null): array
    {
        $site = TenantContext::site();
        if ($site === null) {
            return [];
        }
        $siteId = $siteId ?? (int) $site['id'];

        if (self::$cache !== null && isset(self::$cache[$siteId])) {
            return self::$cache[$siteId];
        }

        $packageId = $site['package_id'] ?? null;
        $pdo = Connection::get();

        if (!$packageId) {
            // بدون پکیج → همه قابلیت‌ها فعال
            $keys = array_column($pdo->query('SELECT feature_key FROM features')->fetchAll(), 'feature_key');
        } else {
            $stmt = $pdo->prepare(
                'SELECT f.feature_key FROM package_features pf
                 JOIN features f ON f.id = pf.feature_id
                 WHERE pf.package_id = ?'
            );
            $stmt->execute([(int) $packageId]);
            $keys = array_column($stmt->fetchAll(), 'feature_key');
        }

        self::$cache[$siteId] = $keys;
        return $keys;
    }

    public static function has(string $key): bool
    {
        return in_array($key, self::enabledKeys(), true);
    }

    /** اگر قابلیت فعال نبود، پاسخ خطا بده و اجرا را متوقف کن */
    public static function require(string $key): void
    {
        if (!self::has($key)) {
            Response::error('این قابلیت در پکیج شما فعال نیست', 403);
        }
    }

    public static function reset(): void
    {
        self::$cache = null;
    }
}
