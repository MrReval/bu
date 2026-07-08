<?php

declare(strict_types=1);

namespace Salon\Tenant;

/**
 * نگه‌دارنده‌ی سایت (سالن) فعلی برای درخواست جاری.
 * site_id برای اسکوپ کردن همه کوئری‌های سالن استفاده می‌شود.
 */
final class TenantContext
{
    private static ?array $site = null;
    private static bool $isPlatform = false;

    public static function setSite(array $site): void
    {
        self::$site = $site;
        self::$isPlatform = false;
    }

    public static function setPlatform(): void
    {
        self::$isPlatform = true;
        self::$site = null;
    }

    public static function isPlatform(): bool
    {
        return self::$isPlatform;
    }

    public static function hasSite(): bool
    {
        return self::$site !== null;
    }

    /** @return array<string,mixed>|null */
    public static function site(): ?array
    {
        return self::$site;
    }

    public static function siteId(): int
    {
        if (self::$site === null) {
            throw new \RuntimeException('سایت مشخص نشده است');
        }
        return (int) self::$site['id'];
    }

    public static function siteIdOrNull(): ?int
    {
        return self::$site !== null ? (int) self::$site['id'] : null;
    }

    public static function reset(): void
    {
        self::$site = null;
        self::$isPlatform = false;
    }
}
