<?php

declare(strict_types=1);

/**
 * انتقال داده‌های نسخه تک‌سالنی (SQLite) به MySQL چند‌سالنی به‌عنوان یک سایت.
 * استفاده:
 *   php scripts/migrate-sqlite-to-mysql.php <sqlitePath> <domain> [siteName]
 * نیازمند افزونه pdo_sqlite.
 */

$root = dirname(__DIR__);
$backend = $root . '/backend';
require $backend . '/bootstrap.php';

use Salon\Config;
use Salon\Database\Connection;
use Salon\Database\Migrator;

Config::load($backend . '/.env');

$sqlitePath = $argv[1] ?? ($root . '/import/database.sqlite');
$domain = strtolower(trim($argv[2] ?? ''));
$siteName = $argv[3] ?? 'سالن';

if (!is_file($sqlitePath)) {
    fwrite(STDERR, "فایل SQLite یافت نشد: {$sqlitePath}\n");
    exit(1);
}
if ($domain === '') {
    fwrite(STDERR, "دامنه الزامی است.\n");
    exit(1);
}

$sqlite = new PDO('sqlite:' . $sqlitePath, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$sqlite->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

Migrator::run();
$pdo = Connection::get();

// نام سالن از تنظیمات قدیمی
try {
    $old = $sqlite->query('SELECT name FROM salon_settings WHERE id = 1')->fetch();
    if ($old && !empty($old['name'])) {
        $siteName = $old['name'];
    }
} catch (\Throwable $e) {}

$exists = $pdo->prepare('SELECT id FROM sites WHERE domain = ?');
$exists->execute([$domain]);
if ($exists->fetch()) {
    fwrite(STDERR, "این دامنه قبلاً وجود دارد.\n");
    exit(1);
}

$pdo->prepare('INSERT INTO sites (name, domain, status) VALUES (?, ?, "active")')->execute([$siteName, $domain]);
$siteId = (int) $pdo->lastInsertId();
echo ">> سایت ساخته شد: id={$siteId}\n";

/** درج یک ردیف با افزودن site_id (در صورت وجود ستون) */
$copy = function (string $table, array $siteColumns) use ($sqlite, $pdo, $siteId) {
    try {
        $rows = $sqlite->query("SELECT * FROM {$table}")->fetchAll();
    } catch (\Throwable $e) {
        echo "!! جدول {$table} در SQLite نیست، رد شد.\n";
        return;
    }
    if (empty($rows)) {
        return;
    }
    $count = 0;
    foreach ($rows as $row) {
        if (in_array($table, $siteColumns, true)) {
            $row['site_id'] = $siteId;
        }
        // salon_settings در اسکیمای جدید کلید site_id دارد نه id
        if ($table === 'salon_settings') {
            unset($row['id']);
        }
        $cols = array_keys($row);
        $ph = implode(',', array_fill(0, count($cols), '?'));
        $colList = implode(',', array_map(fn ($c) => "`{$c}`", $cols));
        try {
            $pdo->prepare("INSERT INTO {$table} ({$colList}) VALUES ({$ph})")->execute(array_values($row));
            $count++;
        } catch (\Throwable $e) {
            fwrite(STDERR, "خطا در {$table}: " . $e->getMessage() . "\n");
        }
    }
    echo ">> {$table}: {$count} ردیف\n";
};

// جدول‌هایی که ستون site_id دارند
$withSite = [
    'users', 'salon_settings', 'landing_sections', 'service_categories', 'services',
    'staff', 'gallery_images', 'staff_portfolio', 'appointments', 'notifications',
];

$pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
foreach ([
    'users', 'customers', 'salon_settings', 'landing_sections', 'service_categories', 'services',
    'staff', 'service_staff', 'staff_working_hours', 'staff_time_off', 'blocked_slots',
    'gallery_images', 'staff_portfolio', 'appointments', 'appointment_services',
    'appointment_status_history', 'notifications', 'api_tokens',
] as $table) {
    $copy($table, $withSite);
}
$pdo->exec('SET FOREIGN_KEY_CHECKS = 1');

echo "OK — مهاجرت کامل شد.\n";
