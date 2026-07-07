<?php

declare(strict_types=1);

/** نصب خط فرمان: php scripts/install-cli.php */

$root = dirname(__DIR__);
$backend = $root . '/backend';
require $backend . '/bootstrap.php';

$salonName = $argv[1] ?? 'سالن زیبایی نمونه';
$adminEmail = $argv[2] ?? 'admin@salon.local';
$adminPassword = $argv[3] ?? 'admin123';
$adminName = $argv[4] ?? 'مدیر';

$storage = $backend . '/storage';
@mkdir($storage . '/uploads', 0755, true);
$dbPath = $storage . '/database.sqlite';
if (is_file($dbPath)) {
    unlink($dbPath);
}

$appKey = bin2hex(random_bytes(16));
file_put_contents($backend . '/.env', "APP_ENV=local\nAPP_KEY={$appKey}\nAPP_URL=http://127.0.0.1:8080\nDB_DATABASE={$dbPath}\n");

Salon\Config::load($backend . '/.env');
Salon\Database\Connection::reset();
Salon\Database\Migrator::run();
Salon\Database\Migrator::seedDefaults();
Salon\Database\Migrator::ensureCategories();

$pdo = Salon\Database\Connection::get();
$pdo->prepare('UPDATE salon_settings SET name = ? WHERE id = 1')->execute([$salonName]);
$adminId = Salon\Services\AuthService::createAdmin($adminName, $adminEmail, $adminPassword, 'super_admin');
$pdo->prepare('INSERT INTO staff (user_id, display_name, color_hex) VALUES (?, ?, ?)')->execute([$adminId, $adminName, '#be185d']);
$staffId = (int) $pdo->lastInsertId();
foreach ($pdo->query('SELECT id FROM services')->fetchAll() as $s) {
    $pdo->prepare('INSERT INTO service_staff (service_id, staff_id) VALUES (?, ?)')->execute([$s['id'], $staffId]);
}
for ($d = 0; $d <= 6; $d++) {
    $isFriday = ($d === 5);
    $pdo->prepare('INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)')
        ->execute([$staffId, $d, $isFriday ? '00:00' : '09:00', $isFriday ? '00:00' : '21:00']);
}
file_put_contents($storage . '/installed.lock', date('c'));

echo "OK\n";
echo "Admin: {$adminEmail} / {$adminPassword}\n";
echo "Web: http://127.0.0.1:8080/\n";
echo "Admin panel: http://127.0.0.1:8080/admin/\n";
