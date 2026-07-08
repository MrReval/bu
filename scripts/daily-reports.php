<?php

declare(strict_types=1);

/**
 * ارسال گزارش روزانه‌ی بله برای همه‌ی سایت‌های فعال.
 * برای اجرای خودکار، این اسکریپت را با کرون روزی یک‌بار اجرا کنید. مثال (شب، ساعت ۲۳):
 *   0 23 * * * php /var/www/html/scripts/daily-reports.php >> /var/log/bale.log 2>&1
 * می‌توانید تاریخ دلخواه را هم پاس بدهید: php scripts/daily-reports.php 2026-07-08
 */

$root = dirname(__DIR__);
$backend = $root . '/backend';
require $backend . '/bootstrap.php';

use Salon\Config;
use Salon\Database\Connection;
use Salon\Services\BaleService;

Config::load($backend . '/.env');

$date = $argv[1] ?? date('Y-m-d');
$pdo = Connection::get();
$sites = $pdo->query(
    "SELECT s.id FROM sites s
     JOIN salon_settings ss ON ss.site_id = s.id
     WHERE s.status = 'active'
       AND ss.bale_daily_enabled = 1
       AND ss.bale_token <> ''
       AND ss.bale_chat_id <> ''"
)->fetchAll();

echo 'ارسال گزارش روز ' . $date . ' برای ' . count($sites) . " سایت\n";
foreach ($sites as $s) {
    $res = BaleService::dailyReport((int) $s['id'], $date);
    echo 'site ' . $s['id'] . ': ' . (!empty($res['ok']) ? 'OK' : 'FAILED') . "\n";
}
