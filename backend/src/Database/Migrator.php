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
        self::ensureColumns();
        self::seedFeatures();
        self::seedPackages();
    }

    /** افزودن ستون‌های جدید به جداول موجود (برای دیتابیس‌های از قبل نصب‌شده) */
    private static function ensureColumns(): void
    {
        self::ensureColumn('site_payment_settings', 'enamad_code', 'TEXT NULL AFTER zibal_merchant');
        self::ensureColumn('site_payment_settings', 'payment_mode', "VARCHAR(20) NOT NULL DEFAULT 'zibal'");
        self::ensureColumn('site_payment_settings', 'card_number', "VARCHAR(32) NOT NULL DEFAULT ''");
        self::ensureColumn('site_payment_settings', 'card_holder', "VARCHAR(150) NOT NULL DEFAULT ''");
        self::ensureColumn('payments', 'receipt_path', 'VARCHAR(255) NULL');
        self::ensureColumn('payments', 'admin_note', 'TEXT NULL');
        self::ensureColumn('salon_settings', 'bale_token', "VARCHAR(255) NOT NULL DEFAULT ''");
        self::ensureColumn('salon_settings', 'bale_chat_id', "VARCHAR(100) NOT NULL DEFAULT ''");
        self::ensureColumn('salon_settings', 'bale_daily_enabled', 'TINYINT NOT NULL DEFAULT 0');
        self::ensureColumn('platform_admins', 'role', "VARCHAR(30) NOT NULL DEFAULT 'super_admin'");
        self::ensureColumn('platform_admins', 'is_active', 'TINYINT NOT NULL DEFAULT 1');
        self::ensureColumn('leads', 'priority', "VARCHAR(20) NOT NULL DEFAULT 'normal'");
        self::ensureColumn('sites', 'business_type', "VARCHAR(32) NOT NULL DEFAULT 'beauty_salon'");
        self::ensureColumn('customers', 'national_id', 'VARCHAR(20) NULL');
        self::ensureColumn('packages', 'business_type', "VARCHAR(32) NOT NULL DEFAULT 'beauty_salon'");
    }

    private static function ensureColumn(string $table, string $column, string $definition): void
    {
        $pdo = Connection::get();
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?'
        );
        $stmt->execute([Config::dbName(), $table, $column]);
        if ((int) $stmt->fetchColumn() === 0) {
            $pdo->exec("ALTER TABLE `{$table}` ADD COLUMN `{$column}` {$definition}");
        }
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
            ['dashboard', 'داشبورد مدیریت', 'پنل مدیریت سالن', 0],
            ['booking', 'نوبت‌دهی آنلاین', 'دریافت نوبت آنلاین از سایت', 1],
            ['website', 'وب‌سایت معرفی', 'وب‌سایت اختصاصی معرفی سالن', 2],
            ['seo', 'وب‌سایت سئوشده', 'بهینه‌سازی برای موتورهای جستجو', 3],
            ['multi_staff', 'مدیریت پرسنل', 'تعریف و مدیریت پرسنل', 4],
            ['unlimited_staff', 'پرسنل نامحدود', 'بدون محدودیت تعداد پرسنل', 5],
            ['staff_dashboard', 'داشبورد اختصاصی پرسنل', 'ورود هر پرسنل به پنل خودش', 6],
            ['staff_portfolio', 'پروفایل و نمونه‌کار پرسنل', 'صفحه اختصاصی و نمونه‌کار هر پرسنل', 7],
            ['gallery', 'گالری نمونه‌کار', 'نمایش گالری کارها در سایت', 8],
            ['sms', 'ارسال پیامک', 'پیامک اطلاع‌رسانی به مشتری و پرسنل', 9],
            ['deposit', 'دریافت بیعانه آنلاین', 'دریافت بیعانه هنگام رزرو از طریق زیبال', 10],
            ['accounting', 'حسابداری', 'گزارش درآمد ماهانه/سالانه و به تفکیک پرسنل', 11],
            ['customer_club', 'باشگاه مشتریان', 'پیامک گروهی، تبریک تولد و مناسبت‌ها', 12],
            ['survey', 'نظرسنجی پس از خدمات', 'ارسال لینک نظرسنجی بعد از خدمت', 13],
            ['qrcode', 'QR کد اختصاصی', 'دریافت QR کد زیبای سالن', 14],
            ['pwa', 'اپلیکیشن اختصاصی (PWA)', 'نصب سایت به‌صورت اپ روی موبایل', 15],
            ['bale_report', 'گزارش روزانه در بله', 'ارسال گزارش روزانه مدیر در پیام‌رسان بله', 16],
            ['support', 'پشتیبانی', 'پشتیبانی استاندارد', 17],
            ['priority_support', 'پشتیبانی اولویت‌دار', 'پاسخ‌گویی سریع‌تر', 18],
            ['vip_support', 'پشتیبانی VIP', 'پشتیبانی اختصاصی و ویژه', 19],
            ['dev_priority', 'اولویت توسعه امکانات', 'اولویت در توسعه قابلیت‌های جدید', 20],
            ['landing_builder', 'شخصی‌سازی لندینگ', 'ویرایش بخش‌ها و ظاهر سایت', 21],
            ['notifications', 'اعلان‌ها', 'مرکز اعلان‌های پنل مدیریت', 22],
        ];
        $check = $pdo->prepare('SELECT id FROM features WHERE feature_key = ?');
        $ins = $pdo->prepare(
            'INSERT INTO features (feature_key, name, description, sort_order) VALUES (?, ?, ?, ?)'
        );
        $upd = $pdo->prepare(
            'UPDATE features SET name = ?, description = ?, sort_order = ? WHERE feature_key = ?'
        );
        foreach ($features as [$key, $name, $desc, $order]) {
            $check->execute([$key]);
            if (!$check->fetch()) {
                $ins->execute([$key, $name, $desc, $order]);
            } else {
                $upd->execute([$name, $desc, $order, $key]);
            }
        }
    }

    /** ساخت پکیج‌های پیش‌فرض پلتفرم — جدا برای هر صنف (idempotent) */
    public static function seedPackages(): void
    {
        $pdo = Connection::get();
        self::ensureColumn('packages', 'business_type', "VARCHAR(32) NOT NULL DEFAULT 'beauty_salon'");

        $map = [];
        foreach ($pdo->query('SELECT id, feature_key FROM features')->fetchAll() as $f) {
            $map[$f['feature_key']] = (int) $f['id'];
        }

        $core = ['dashboard', 'multi_staff', 'booking', 'website', 'notifications', 'support'];
        $plusShared = [
            'unlimited_staff', 'staff_dashboard', 'seo', 'sms', 'deposit', 'accounting',
            'customer_club', 'survey', 'qrcode', 'pwa', 'landing_builder', 'priority_support',
        ];
        $proVip = ['bale_report', 'vip_support', 'dev_priority'];

        // فیچرهای بصری مخصوص هر صنف
        $byVertical = [
            'beauty_salon' => [
                'label' => 'سالن زیبایی',
                'plus_extra' => ['gallery', 'staff_portfolio'],
                'tiers' => [
                    ['پرو سالن', 'مناسب سالن‌ها و آرایشگاه‌های کوچک', 2990000, 30498000],
                    ['پلاس سالن', 'محبوب‌ترین پلن سالن با گالری و باشگاه مشتریان', 4990000, 50898000],
                    ['حرفه‌ای سالن', 'حداکثر امکانات سالن و پشتیبانی VIP', 6990000, 71298000],
                ],
            ],
            'dental_clinic' => [
                'label' => 'کلینیک دندان',
                'plus_extra' => ['gallery'],
                'tiers' => [
                    ['پرو دندان', 'مناسب مطب‌ها و کلینیک‌های کوچک دندان‌پزشکی', 2990000, 30498000],
                    ['پلاس دندان', 'نوبت‌دهی، بیعانه و گالری کلینیک دندان', 4990000, 50898000],
                    ['حرفه‌ای دندان', 'حداکثر امکانات کلینیک دندان و پشتیبانی VIP', 6990000, 71298000],
                ],
            ],
            'medical_practice' => [
                'label' => 'مطب پزشکی',
                'plus_extra' => [],
                'tiers' => [
                    ['پرو مطب', 'مناسب مطب شخصی و تراپیست‌ها', 2990000, 30498000],
                    ['پلاس مطب', 'نوبت‌دهی کامل، پیامک و باشگاه بیماران', 4990000, 50898000],
                    ['حرفه‌ای مطب', 'حداکثر امکانات مطب و پشتیبانی VIP', 6990000, 71298000],
                ],
            ],
        ];

        // پکیج‌های قدیمی عمومی را به سالن منتقل کن
        $legacy = [
            'پرو' => 'پرو سالن',
            'پلاس' => 'پلاس سالن',
            'حرفه‌ای' => 'حرفه‌ای سالن',
        ];
        foreach ($legacy as $old => $new) {
            $pdo->prepare(
                "UPDATE packages SET name = ?, business_type = 'beauty_salon', description = COALESCE(NULLIF(description, ''), ?)
                 WHERE name = ? AND (business_type = '' OR business_type = 'beauty_salon' OR business_type IS NULL)"
            )->execute([$new, 'مناسب سالن زیبایی', $old]);
        }
        $pdo->exec("UPDATE packages SET business_type = 'beauty_salon' WHERE business_type IS NULL OR business_type = ''");

        $check = $pdo->prepare('SELECT id FROM packages WHERE name = ? AND business_type = ?');
        $insPkg = $pdo->prepare(
            'INSERT INTO packages (name, description, price_monthly, price_yearly, is_active, business_type) VALUES (?,?,?,?,1,?)'
        );
        $insFeat = $pdo->prepare('INSERT INTO package_features (package_id, feature_id) VALUES (?, ?)');

        foreach ($byVertical as $type => $meta) {
            $plusKeys = array_merge($core, $plusShared, $meta['plus_extra']);
            $proKeys = array_merge($plusKeys, $proVip);
            $tierKeys = [$core, $plusKeys, $proKeys];

            foreach ($meta['tiers'] as $i => [$name, $desc, $monthly, $yearly]) {
                $check->execute([$name, $type]);
                if ($check->fetch()) {
                    continue;
                }
                $insPkg->execute([$name, $desc, $monthly, $yearly, $type]);
                $pkgId = (int) $pdo->lastInsertId();
                foreach (array_unique($tierKeys[$i]) as $k) {
                    if (isset($map[$k])) {
                        $insFeat->execute([$pkgId, $map[$k]]);
                    }
                }
            }
        }
    }

    /** داده‌های پیش‌فرض برای یک سایت مشخص (بر اساس قالب عمودی) */
    public static function seedDefaults(int $siteId, string $businessType = 'beauty_salon'): void
    {
        $pdo = Connection::get();
        $vertical = \Salon\Tenant\VerticalRegistry::get($businessType);
        $defaultName = $vertical['default_name'];

        $exists = $pdo->prepare('SELECT COUNT(*) FROM salon_settings WHERE site_id = ?');
        $exists->execute([$siteId]);
        if ((int) $exists->fetchColumn() === 0) {
            $pdo->prepare(
                'INSERT INTO salon_settings (site_id, name, primary_color, secondary_color, hero_title, hero_subtitle) VALUES (?, ?, ?, ?, ?, ?)'
            )->execute([
                $siteId,
                $defaultName,
                $vertical['primary_color'],
                $vertical['secondary_color'],
                $vertical['labels']['hero_title'],
                $vertical['labels']['hero_subtitle'],
            ]);
        } else {
            // همگام‌سازی رنگ و هیرو با قالب (اگر هنوز پیش‌فرض سالن مانده باشد، جایگزین می‌شود)
            $pdo->prepare(
                'UPDATE salon_settings SET
                    primary_color = ?,
                    secondary_color = ?,
                    hero_title = ?,
                    hero_subtitle = ?
                 WHERE site_id = ?'
            )->execute([
                $vertical['primary_color'],
                $vertical['secondary_color'],
                $vertical['labels']['hero_title'],
                $vertical['labels']['hero_subtitle'],
                $siteId,
            ]);
        }

        $hours = json_encode($vertical['hours'], JSON_UNESCAPED_UNICODE);
        $pdo->prepare('UPDATE salon_settings SET business_hours_json = ? WHERE site_id = ?')
            ->execute([$hours, $siteId]);

        // قوانین رزرو بر اساس قالب
        $features = $vertical['features'];
        $rules = [
            'allow_staff_selection' => true,
            'staff_selection_required' => !empty($features['staff_selection_required']),
            'multi_service' => !empty($features['multi_service_booking']),
            'auto_confirm' => false,
        ];
        $pdo->prepare('UPDATE salon_settings SET booking_rules_json = ? WHERE site_id = ?')
            ->execute([json_encode($rules, JSON_UNESCAPED_UNICODE), $siteId]);

        $sections = $pdo->prepare('SELECT COUNT(*) FROM landing_sections WHERE site_id = ?');
        $sections->execute([$siteId]);
        if ((int) $sections->fetchColumn() === 0) {
            $stmt = $pdo->prepare('INSERT INTO landing_sections (site_id, type, sort_order, config_json) VALUES (?, ?, ?, ?)');
            foreach ($vertical['landing'] as $d) {
                $stmt->execute([$siteId, $d[0], $d[1], $d[2]]);
            }
        }

        self::ensureCategories($siteId, $businessType);

        $svcs = $pdo->prepare('SELECT COUNT(*) FROM services WHERE site_id = ?');
        $svcs->execute([$siteId]);
        if ((int) $svcs->fetchColumn() === 0) {
            $ins = $pdo->prepare(
                'INSERT INTO services (site_id, category_id, name, description, duration_minutes, price) VALUES (?,?,?,?,?,?)'
            );
            foreach ($vertical['services'] as [$catName, $name, $desc, $mins, $price]) {
                $catId = self::categoryId($siteId, $catName);
                $ins->execute([$siteId, $catId, $name, $desc, $mins, $price]);
            }
        }

        self::seedDefaultImages($siteId, $businessType);
    }

    /** مسیر پوشه‌ی عکس‌های دموی اولیه (import/uploads/{vertical} یا fallback عمومی) */
    private static function importUploadsDir(?string $businessType = null): string
    {
        $base = dirname(Config::basePath()) . '/import/uploads';
        if ($businessType) {
            $typed = $base . '/' . \Salon\Tenant\VerticalRegistry::normalize($businessType);
            if (is_dir($typed)) {
                return $typed;
            }
        }
        return $base;
    }

    /** کپی یک فایل دمو به فضای آپلود سایت و بازگرداندن مسیر عمومی */
    private static function copyDemoFile(string $src, int $siteId, string $folder): ?string
    {
        if (!is_file($src)) {
            return null;
        }
        $ext = strtolower(pathinfo($src, PATHINFO_EXTENSION)) ?: 'jpg';
        $dir = Config::storagePath() . '/uploads/' . $siteId . '/' . $folder;
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            return null;
        }
        $name = date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        if (!@copy($src, $dir . '/' . $name)) {
            return null;
        }
        return '/uploads/' . $siteId . '/' . $folder . '/' . $name;
    }

    /** @return string[] فایل‌های تصویری یک پوشه */
    private static function imageFiles(string $dir): array
    {
        if (!is_dir($dir)) {
            return [];
        }
        $out = [];
        foreach (scandir($dir) as $f) {
            $full = $dir . '/' . $f;
            if (is_file($full) && preg_match('/\.(jpe?g|png|webp|gif)$/i', $f)) {
                $out[] = $full;
            }
        }
        sort($out);
        return $out;
    }

    /** عکس‌های پیش‌فرض سایت (هیرو/لوگو/گالری) بر اساس قالب */
    public static function seedDefaultImages(int $siteId, string $businessType = 'beauty_salon'): void
    {
        $businessType = \Salon\Tenant\VerticalRegistry::normalize($businessType);
        $vertical = \Salon\Tenant\VerticalRegistry::get($businessType);
        $base = self::importUploadsDir($businessType);
        if (!is_dir($base)) {
            return;
        }
        $pdo = Connection::get();
        $wantGallery = !empty($vertical['features']['gallery']);

        $heroFiles = self::imageFiles($base . '/hero');
        if ($heroFiles) {
            $check = $pdo->prepare('SELECT hero_image FROM salon_settings WHERE site_id = ?');
            $check->execute([$siteId]);
            if (!$check->fetchColumn()) {
                $dest = self::copyDemoFile($heroFiles[0], $siteId, 'hero');
                if ($dest) {
                    $pdo->prepare('UPDATE salon_settings SET hero_image = ? WHERE site_id = ?')->execute([$dest, $siteId]);
                }
            }
        }

        $logoFiles = self::imageFiles($base . '/logo');
        if ($logoFiles) {
            $check = $pdo->prepare('SELECT logo_path FROM salon_settings WHERE site_id = ?');
            $check->execute([$siteId]);
            if (!$check->fetchColumn()) {
                $dest = self::copyDemoFile($logoFiles[0], $siteId, 'logo');
                if ($dest) {
                    $pdo->prepare('UPDATE salon_settings SET logo_path = ? WHERE site_id = ?')->execute([$dest, $siteId]);
                }
            }
        }

        if ($wantGallery) {
            $galleryFiles = self::imageFiles($base . '/gallery');
            if ($galleryFiles) {
                $cnt = $pdo->prepare('SELECT COUNT(*) FROM gallery_images WHERE site_id = ?');
                $cnt->execute([$siteId]);
                if ((int) $cnt->fetchColumn() === 0) {
                    $ins = $pdo->prepare('INSERT INTO gallery_images (site_id, file_path, sort_order) VALUES (?,?,?)');
                    $order = 0;
                    foreach ($galleryFiles as $g) {
                        $dest = self::copyDemoFile($g, $siteId, 'gallery');
                        if ($dest) {
                            $ins->execute([$siteId, $dest, $order++]);
                        }
                    }
                }
            }
        }

        // عکس پیش‌فرض برای خدمات از همان قالب
        $pool = array_merge(
            self::imageFiles($base . '/gallery'),
            self::imageFiles($base . '/hero')
        );
        if ($pool) {
            $svcStmt = $pdo->prepare("SELECT id FROM services WHERE site_id = ? AND (image_path IS NULL OR image_path = '') ORDER BY id");
            $svcStmt->execute([$siteId]);
            $serviceIds = $svcStmt->fetchAll(\PDO::FETCH_COLUMN);
            if ($serviceIds) {
                $upd = $pdo->prepare('UPDATE services SET image_path = ? WHERE id = ?');
                $i = 0;
                foreach ($serviceIds as $svcId) {
                    $src = $pool[$i % count($pool)];
                    $dest = self::copyDemoFile($src, $siteId, 'services');
                    if ($dest) {
                        $upd->execute([$dest, (int) $svcId]);
                    }
                    $i++;
                }
            }
        }
    }

    /** عکس آواتار و نمونه‌کار پیش‌فرض برای پرسنل تازه‌ساخته‌شده */
    public static function seedStaffMedia(int $siteId, int $staffId, string $businessType = 'beauty_salon'): void
    {
        $businessType = \Salon\Tenant\VerticalRegistry::normalize($businessType);
        $vertical = \Salon\Tenant\VerticalRegistry::get($businessType);
        $base = self::importUploadsDir($businessType);
        $fallback = self::importUploadsDir(null);
        if (!is_dir($base) && !is_dir($fallback)) {
            return;
        }
        $pdo = Connection::get();

        $avatars = array_merge(self::imageFiles($base . '/avatars'), self::imageFiles($fallback . '/avatars'));
        if ($avatars) {
            $dest = self::copyDemoFile($avatars[0], $siteId, 'avatars');
            if ($dest) {
                $pdo->prepare('UPDATE staff SET avatar_path = ? WHERE id = ? AND site_id = ?')->execute([$dest, $staffId, $siteId]);
            }
        }

        if (empty($vertical['features']['staff_portfolio'])) {
            return;
        }

        // نمونه‌کارها معمولاً در import/uploads/portfolio/<oldStaffId>/... هستند
        $portfolioFiles = [];
        foreach ([$base, $fallback] as $root) {
            $portfolioRoot = $root . '/portfolio';
            if (!is_dir($portfolioRoot)) {
                continue;
            }
            foreach (scandir($portfolioRoot) as $sub) {
                if ($sub === '.' || $sub === '..') {
                    continue;
                }
                $portfolioFiles = array_merge($portfolioFiles, self::imageFiles($portfolioRoot . '/' . $sub));
            }
            $portfolioFiles = array_merge($portfolioFiles, self::imageFiles($portfolioRoot));
        }
        if ($portfolioFiles) {
            $ins = $pdo->prepare(
                'INSERT INTO staff_portfolio (site_id, staff_id, file_path, sort_order) VALUES (?,?,?,?)'
            );
            $order = 0;
            foreach ($portfolioFiles as $p) {
                $dest = self::copyDemoFile($p, $siteId, 'portfolio/' . $staffId);
                if ($dest) {
                    $ins->execute([$siteId, $staffId, $dest, $order++]);
                }
            }
        }
    }

    private static function categoryId(int $siteId, string $name): ?int
    {
        $stmt = Connection::get()->prepare('SELECT id FROM service_categories WHERE site_id = ? AND name = ?');
        $stmt->execute([$siteId, $name]);
        $id = $stmt->fetchColumn();
        return $id ? (int) $id : null;
    }

    /** دسته‌های استاندارد برای یک سایت (بر اساس قالب) */
    public static function ensureCategories(int $siteId, string $businessType = 'beauty_salon'): void
    {
        $pdo = Connection::get();
        $vertical = \Salon\Tenant\VerticalRegistry::get($businessType);
        $categories = $vertical['categories'];
        $check = $pdo->prepare('SELECT id FROM service_categories WHERE site_id = ? AND name = ?');
        $insert = $pdo->prepare(
            'INSERT INTO service_categories (site_id, name, sort_order, is_active) VALUES (?, ?, ?, 1)'
        );
        foreach ($categories as $order => $name) {
            $check->execute([$siteId, $name]);
            if (!$check->fetch()) {
                $insert->execute([$siteId, $name, $order]);
            }
        }
        // دموی قدیمی فقط برای سالن زیبایی
        if (\Salon\Tenant\VerticalRegistry::normalize($businessType) === \Salon\Tenant\VerticalRegistry::BEAUTY) {
            self::ensureDemoServicesForEmptyCategories($siteId);
        }
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
