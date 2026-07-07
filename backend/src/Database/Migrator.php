<?php

declare(strict_types=1);

namespace Salon\Database;

use Salon\Config;

final class Migrator
{
    public static function run(): void
    {
        $schema = Config::basePath() . '/database/schema.sql';
        $sql = file_get_contents($schema);
        Connection::get()->exec($sql);
    }

    public static function seedDefaults(): void
    {
        $pdo = Connection::get();

        $exists = $pdo->query('SELECT COUNT(*) FROM salon_settings')->fetchColumn();
        if ((int) $exists === 0) {
            $pdo->exec("INSERT INTO salon_settings (id, name) VALUES (1, 'سالن زیبایی')");
        }

        $hours = json_encode([
            '0' => ['open' => '09:00', 'close' => '21:00', 'closed' => false],
            '1' => ['open' => '09:00', 'close' => '21:00', 'closed' => false],
            '2' => ['open' => '09:00', 'close' => '21:00', 'closed' => false],
            '3' => ['open' => '09:00', 'close' => '21:00', 'closed' => false],
            '4' => ['open' => '09:00', 'close' => '21:00', 'closed' => false],
            // در ایران معمولاً جمعه تعطیل است (w=5)، شنبه باز است (w=6)
            '5' => ['open' => '', 'close' => '', 'closed' => true],
            '6' => ['open' => '09:00', 'close' => '21:00', 'closed' => false],
        ], JSON_UNESCAPED_UNICODE);
        $pdo->prepare('UPDATE salon_settings SET business_hours_json = ? WHERE id = 1')->execute([$hours]);

        $sections = $pdo->query('SELECT COUNT(*) FROM landing_sections')->fetchColumn();
        if ((int) $sections === 0) {
            $defaults = [
                ['hero', 0, '{"use_settings":true}'],
                ['services', 1, '{"title":"خدمات ما"}'],
                ['about', 2, '{"title":"درباره ما"}'],
                ['cta', 3, '{"title":"همین حالا نوبت بگیرید","button_text":"رزرو آنلاین","button_link":"/book"}'],
            ];
            $stmt = $pdo->prepare('INSERT INTO landing_sections (type, sort_order, config_json) VALUES (?, ?, ?)');
            foreach ($defaults as $d) {
                $stmt->execute($d);
            }
        }

        self::ensureCategories();

        $svcs = $pdo->query('SELECT COUNT(*) FROM services')->fetchColumn();
        if ((int) $svcs === 0) {
            $catNail = $pdo->query("SELECT id FROM service_categories WHERE name = 'ناخن'")->fetchColumn();
            $catHair = $pdo->query("SELECT id FROM service_categories WHERE name = 'مو'")->fetchColumn();
            $pdo->prepare(
                'INSERT INTO services (category_id, name, description, duration_minutes, price) VALUES (?,?,?,?,?), (?,?,?,?,?), (?,?,?,?,?), (?,?,?,?,?)'
            )->execute([
                $catNail, 'مانیکور', 'مانیکور حرفه‌ای', 45, 250000,
                $catNail, 'پدیکور', 'پدیکور کامل', 60, 350000,
                $catNail, 'کاشت ناخن', 'کاشت و طراحی', 90, 800000,
                $catHair, 'کوتاهی مو', 'کوتاهی و استایل', 30, 200000,
            ]);
        }
    }

    /** دسته‌های استاندارد — در نصب‌های قبلی هم دسته‌های جدید اضافه می‌شوند */
    public static function ensureCategories(): void
    {
        $pdo = Connection::get();
        $categories = [
            ['ناخن', 0],
            ['مو', 1],
            ['پوست', 2],
            ['میک آپ', 3],
            ['مژه', 4],
            ['اصلاح', 5],
            ['میکروبلیدینگ', 6],
        ];

        $check = $pdo->prepare('SELECT id FROM service_categories WHERE name = ?');
        $insert = $pdo->prepare(
            'INSERT INTO service_categories (name, sort_order, is_active) VALUES (?, ?, 1)'
        );

        foreach ($categories as [$name, $order]) {
            $check->execute([$name]);
            if (!$check->fetch()) {
                $insert->execute([$name, $order]);
            }
        }

        self::ensureDemoServicesForEmptyCategories();
    }

    /** یک خدمت نمونه برای دسته‌های بدون خدمت (نمایش در فرانت) */
    public static function ensureDemoServicesForEmptyCategories(): void
    {
        $pdo = Connection::get();
        $demos = [
            'پوست' => ['فیشیال و مراقبت پوست', 'پاکسازی و آبررسانی تخصصی', 45, 450000],
            'میک آپ' => ['میکاپ روزانه', 'میکاپ مجلسی و عروس', 60, 800000],
            'مژه' => ['اکستنشن مژه', 'مژه حجم‌دار و کلاسیک', 90, 550000],
            'اصلاح' => ['اصلاح ابرو', 'فرم‌دهی و اصلاح ابرو', 25, 180000],
            'میکروبلیدینگ' => ['میکروبلیدینگ ابرو', 'طراحی ابرو با تکنیک میکرو', 120, 2500000],
        ];

        $catStmt = $pdo->prepare('SELECT id FROM service_categories WHERE name = ?');
        $countStmt = $pdo->prepare('SELECT COUNT(*) FROM services WHERE category_id = ?');
        $ins = $pdo->prepare(
            'INSERT INTO services (category_id, name, description, duration_minutes, price, is_active) VALUES (?,?,?,?,?,1)'
        );

        foreach ($demos as $catName => [$serviceName, $desc, $mins, $price]) {
            $catStmt->execute([$catName]);
            $catId = $catStmt->fetchColumn();
            if (!$catId) {
                continue;
            }
            $countStmt->execute([$catId]);
            if ((int) $countStmt->fetchColumn() > 0) {
                continue;
            }
            $ins->execute([$catId, $serviceName, $desc, $mins, $price]);
        }
    }

    public static function ensureMediaTables(): void
    {
        $pdo = Connection::get();
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS gallery_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT NOT NULL,
                caption TEXT DEFAULT "",
                sort_order INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )'
        );
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS staff_portfolio (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                staff_id INTEGER NOT NULL,
                file_path TEXT NOT NULL,
                caption TEXT DEFAULT "",
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
            )'
        );

        $cols = $pdo->query('PRAGMA table_info(staff)')->fetchAll();
        $names = array_column($cols, 'name');
        if (!in_array('satisfaction_percent', $names, true)) {
            $pdo->exec('ALTER TABLE staff ADD COLUMN satisfaction_percent INTEGER NOT NULL DEFAULT 98');
        }

        self::ensureSalonSettingsColumns();
    }

    public static function ensureSalonSettingsColumns(): void
    {
        $pdo = Connection::get();
        $cols = $pdo->query('PRAGMA table_info(salon_settings)')->fetchAll();
        $names = array_column($cols, 'name');
        if (!in_array('logo_path', $names, true)) {
            $pdo->exec('ALTER TABLE salon_settings ADD COLUMN logo_path TEXT');
        }
        if (!in_array('favicon_path', $names, true)) {
            $pdo->exec('ALTER TABLE salon_settings ADD COLUMN favicon_path TEXT');
        }
    }

    /** اصلاح ساعات کاری پرسنل: در نصب‌های قدیمی شنبه (w=6) اشتباه ۰۰:۰۰–۰۰:۰۰ بود */
    public static function ensureStaffWorkingHours(): void
    {
        $pdo = Connection::get();
        $pdo->exec(
            "UPDATE staff_working_hours
             SET start_time = '09:00', end_time = '21:00'
             WHERE day_of_week = 6 AND start_time = '00:00' AND end_time = '00:00'"
        );
    }
}
