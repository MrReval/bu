<?php

declare(strict_types=1);

namespace Salon\Database;

use Salon\Config;

final class Migrator
{
    /** اجرای اسکیمای MySQL (idempotent) */
    public static function run(): void
    {
        $schema = Config::basePath() . '/database/schema.sql';
        $sql = (string) file_get_contents($schema);
        $pdo = Connection::get();
        foreach (self::splitStatements($sql) as $stmt) {
            $pdo->exec($stmt);
        }
        self::seedFeatures();
    }

    /** @return string[] */
    private static function splitStatements(string $sql): array
    {
        $out = [];
        foreach (explode(';', $sql) as $part) {
            $trimmed = trim($part);
            if ($trimmed === '') {
                continue;
            }
            // حذف خطوط کامنت‌شده کامل
            $lines = array_filter(
                explode("\n", $trimmed),
                static fn ($l) => !str_starts_with(trim($l), '--')
            );
            $clean = trim(implode("\n", $lines));
            if ($clean !== '') {
                $out[] = $clean;
            }
        }
        return $out;
    }

    /** رجیستری قابلیت‌ها برای پکیج‌ها */
    public static function seedFeatures(): void
    {
        $pdo = Connection::get();
        $features = [
            ['booking', 'رزرو آنلاین', 'دریافت نوبت آنلاین از سایت', 0],
            ['gallery', 'گالری تصاویر', 'نمایش گالری کارها در سایت', 1],
            ['staff_portfolio', 'نمونه‌کار پرسنل', 'صفحه اختصاصی و نمونه‌کار هر پرسنل', 2],
            ['multi_staff', 'چند پرسنل', 'امکان تعریف چند پرسنل', 3],
            ['sms', 'پیامک', 'ارسال پیامک اطلاع‌رسانی به مشتری و پرسنل', 4],
            ['deposit', 'بیعانه و درگاه پرداخت', 'دریافت بیعانه هنگام رزرو از طریق زیبال', 5],
            ['landing_builder', 'شخصی‌سازی لندینگ', 'ویرایش بخش‌ها و ظاهر سایت', 6],
            ['notifications', 'اعلان‌ها', 'مرکز اعلان‌های پنل مدیریت', 7],
        ];
        $check = $pdo->prepare('SELECT id FROM features WHERE feature_key = ?');
        $ins = $pdo->prepare(
            'INSERT INTO features (feature_key, name, description, sort_order) VALUES (?, ?, ?, ?)'
        );
        foreach ($features as [$key, $name, $desc, $order]) {
            $check->execute([$key]);
            if (!$check->fetch()) {
                $ins->execute([$key, $name, $desc, $order]);
            }
        }
    }

    /** داده‌های پیش‌فرض برای یک سایت مشخص */
    public static function seedDefaults(int $siteId): void
    {
        $pdo = Connection::get();

        $exists = $pdo->prepare('SELECT COUNT(*) FROM salon_settings WHERE site_id = ?');
        $exists->execute([$siteId]);
        if ((int) $exists->fetchColumn() === 0) {
            $pdo->prepare("INSERT INTO salon_settings (site_id, name) VALUES (?, 'سالن زیبایی')")
                ->execute([$siteId]);
        }

        $hours = json_encode([
            '0' => ['open' => '09:00', 'close' => '21:00', 'closed' => false],
            '1' => ['open' => '09:00', 'close' => '21:00', 'closed' => false],
            '2' => ['open' => '09:00', 'close' => '21:00', 'closed' => false],
            '3' => ['open' => '09:00', 'close' => '21:00', 'closed' => false],
            '4' => ['open' => '09:00', 'close' => '21:00', 'closed' => false],
            '5' => ['open' => '', 'close' => '', 'closed' => true],
            '6' => ['open' => '09:00', 'close' => '21:00', 'closed' => false],
        ], JSON_UNESCAPED_UNICODE);
        $pdo->prepare('UPDATE salon_settings SET business_hours_json = ? WHERE site_id = ?')
            ->execute([$hours, $siteId]);

        $sections = $pdo->prepare('SELECT COUNT(*) FROM landing_sections WHERE site_id = ?');
        $sections->execute([$siteId]);
        if ((int) $sections->fetchColumn() === 0) {
            $defaults = [
                ['hero', 0, '{"use_settings":true}'],
                ['services', 1, '{"title":"خدمات ما"}'],
                ['about', 2, '{"title":"درباره ما"}'],
                ['cta', 3, '{"title":"همین حالا نوبت بگیرید","button_text":"رزرو آنلاین","button_link":"/book"}'],
            ];
            $stmt = $pdo->prepare('INSERT INTO landing_sections (site_id, type, sort_order, config_json) VALUES (?, ?, ?, ?)');
            foreach ($defaults as $d) {
                $stmt->execute([$siteId, $d[0], $d[1], $d[2]]);
            }
        }

        self::ensureCategories($siteId);

        $svcs = $pdo->prepare('SELECT COUNT(*) FROM services WHERE site_id = ?');
        $svcs->execute([$siteId]);
        if ((int) $svcs->fetchColumn() === 0) {
            $catNail = self::categoryId($siteId, 'ناخن');
            $catHair = self::categoryId($siteId, 'مو');
            $pdo->prepare(
                'INSERT INTO services (site_id, category_id, name, description, duration_minutes, price) VALUES (?,?,?,?,?,?)'
            );
            $ins = $pdo->prepare(
                'INSERT INTO services (site_id, category_id, name, description, duration_minutes, price) VALUES (?,?,?,?,?,?)'
            );
            $ins->execute([$siteId, $catNail, 'مانیکور', 'مانیکور حرفه‌ای', 45, 250000]);
            $ins->execute([$siteId, $catNail, 'پدیکور', 'پدیکور کامل', 60, 350000]);
            $ins->execute([$siteId, $catNail, 'کاشت ناخن', 'کاشت و طراحی', 90, 800000]);
            $ins->execute([$siteId, $catHair, 'کوتاهی مو', 'کوتاهی و استایل', 30, 200000]);
        }
    }

    private static function categoryId(int $siteId, string $name): ?int
    {
        $stmt = Connection::get()->prepare('SELECT id FROM service_categories WHERE site_id = ? AND name = ?');
        $stmt->execute([$siteId, $name]);
        $id = $stmt->fetchColumn();
        return $id ? (int) $id : null;
    }

    /** دسته‌های استاندارد برای یک سایت */
    public static function ensureCategories(int $siteId): void
    {
        $pdo = Connection::get();
        $categories = [
            ['ناخن', 0], ['مو', 1], ['پوست', 2], ['میک آپ', 3],
            ['مژه', 4], ['اصلاح', 5], ['میکروبلیدینگ', 6],
        ];
        $check = $pdo->prepare('SELECT id FROM service_categories WHERE site_id = ? AND name = ?');
        $insert = $pdo->prepare(
            'INSERT INTO service_categories (site_id, name, sort_order, is_active) VALUES (?, ?, ?, 1)'
        );
        foreach ($categories as [$name, $order]) {
            $check->execute([$siteId, $name]);
            if (!$check->fetch()) {
                $insert->execute([$siteId, $name, $order]);
            }
        }
        self::ensureDemoServicesForEmptyCategories($siteId);
    }

    public static function ensureDemoServicesForEmptyCategories(int $siteId): void
    {
        $pdo = Connection::get();
        $demos = [
            'پوست' => ['فیشیال و مراقبت پوست', 'پاکسازی و آبررسانی تخصصی', 45, 450000],
            'میک آپ' => ['میکاپ روزانه', 'میکاپ مجلسی و عروس', 60, 800000],
            'مژه' => ['اکستنشن مژه', 'مژه حجم‌دار و کلاسیک', 90, 550000],
            'اصلاح' => ['اصلاح ابرو', 'فرم‌دهی و اصلاح ابرو', 25, 180000],
            'میکروبلیدینگ' => ['میکروبلیدینگ ابرو', 'طراحی ابرو با تکنیک میکرو', 120, 2500000],
        ];
        $catStmt = $pdo->prepare('SELECT id FROM service_categories WHERE site_id = ? AND name = ?');
        $countStmt = $pdo->prepare('SELECT COUNT(*) FROM services WHERE site_id = ? AND category_id = ?');
        $ins = $pdo->prepare(
            'INSERT INTO services (site_id, category_id, name, description, duration_minutes, price, is_active) VALUES (?,?,?,?,?,?,1)'
        );
        foreach ($demos as $catName => [$serviceName, $desc, $mins, $price]) {
            $catStmt->execute([$siteId, $catName]);
            $catId = $catStmt->fetchColumn();
            if (!$catId) {
                continue;
            }
            $countStmt->execute([$siteId, (int) $catId]);
            if ((int) $countStmt->fetchColumn() > 0) {
                continue;
            }
            $ins->execute([$siteId, (int) $catId, $serviceName, $desc, $mins, $price]);
        }
    }

    // ── متدهای سازگاری (اسکیما در MySQL کامل ساخته می‌شود) ──────────────────
    public static function ensureMediaTables(): void
    {
        // در MySQL همه جداول در schema.sql ساخته می‌شوند
    }

    public static function ensureSalonSettingsColumns(): void
    {
        // بدون نیاز؛ ستون‌ها در اسکیما موجودند
    }

    public static function ensureStaffWorkingHours(): void
    {
        // بدون نیاز
    }
}
