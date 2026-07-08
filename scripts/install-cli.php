<?php

declare(strict_types=1);

/**
 * نصب خط فرمان (MySQL چند‌سالنی).
 * استفاده:
 *   php scripts/install-cli.php <superName> <superEmail> <superPass> \
 *       [firstSiteName] [firstSiteDomain] [firstAdminEmail] [firstAdminPass]
 * اتصال MySQL از متغیرهای محیطی DB_* خوانده می‌شود.
 */

$root = dirname(__DIR__);
$backend = $root . '/backend';
require $backend . '/bootstrap.php';

use Salon\Config;
use Salon\Database\Connection;
use Salon\Database\Migrator;
use Salon\Services\PlatformAuthService;
use Salon\Services\SiteService;

Config::load($backend . '/.env');

$superName = $argv[1] ?? 'مدیر پلتفرم';
$superEmail = $argv[2] ?? 'super@platform.local';
$superPass = $argv[3] ?? 'super1234';

$siteName = $argv[4] ?? '';
$siteDomain = $argv[5] ?? '';
$siteAdminEmail = $argv[6] ?? '';
$siteAdminPass = $argv[7] ?? '';

$storage = $backend . '/storage';
@mkdir($storage . '/uploads', 0755, true);

echo ">> اجرای مهاجرت اسکیمای MySQL...\n";
Migrator::run();

echo ">> ساخت مدیر پلتفرم (در صورت نبود)...\n";
PlatformAuthService::ensureFirstAdmin($superName, $superEmail, $superPass);

$pdo = Connection::get();
$siteCount = (int) $pdo->query('SELECT COUNT(*) FROM sites')->fetchColumn();

if ($siteCount === 0 && $siteName !== '' && $siteDomain !== '') {
    echo ">> ساخت اولین سایت: {$siteDomain}\n";
    try {
        SiteService::create([
            'name' => $siteName,
            'domain' => $siteDomain,
            'admin_name' => 'مدیر',
            'admin_email' => $siteAdminEmail ?: ('admin@' . $siteDomain),
            'admin_password' => $siteAdminPass ?: 'admin123',
        ]);
    } catch (\Throwable $e) {
        echo "!! خطا در ساخت سایت: " . $e->getMessage() . "\n";
    }
}

file_put_contents($storage . '/installed.lock', date('c'));

echo "OK\n";
echo "سوپرادمین: {$superEmail} / {$superPass}\n";
if ($siteName !== '' && $siteDomain !== '') {
    echo "سایت اول: https://{$siteDomain}/admin/  →  " . ($siteAdminEmail ?: ('admin@' . $siteDomain)) . " / " . ($siteAdminPass ?: 'admin123') . "\n";
}
