<?php

declare(strict_types=1);

$backendPath = dirname(__DIR__) . '/backend';
$storagePath = $backendPath . '/storage';
$lockFile = $storagePath . '/installed.lock';

if (is_file($lockFile)) {
    header('Location: /admin');
    exit;
}

$step = (int) ($_GET['step'] ?? 1);
$error = '';
$success = false;

function checkRequirements(): array
{
    $issues = [];
    if (version_compare(PHP_VERSION, '8.2.0', '<')) {
        $issues[] = 'PHP 8.2+ لازم است (فعلی: ' . PHP_VERSION . ')';
    }
    foreach (['pdo_sqlite', 'json', 'mbstring'] as $ext) {
        if (!extension_loaded($ext)) {
            $issues[] = "افزونه $ext نصب نیست";
        }
    }
    return $issues;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $step === 2) {
    $issues = checkRequirements();
    $salonName = trim($_POST['salon_name'] ?? '');
    $adminName = trim($_POST['admin_name'] ?? '');
    $adminEmail = trim($_POST['admin_email'] ?? '');
    $adminPassword = $_POST['admin_password'] ?? '';

    if ($salonName === '' || $adminName === '' || $adminEmail === '' || strlen($adminPassword) < 6) {
        $error = 'همه فیلدها را پر کنید (رمز حداقل ۶ کاراکتر)';
    } elseif (!empty($issues)) {
        $error = implode(' | ', $issues);
    } else {
        try {
            if (!is_dir($storagePath)) {
                mkdir($storagePath, 0755, true);
            }
            mkdir($storagePath . '/uploads', 0755, true);

            $dbPath = $storagePath . '/database.sqlite';
            if (is_file($dbPath)) {
                unlink($dbPath);
            }

            require $backendPath . '/bootstrap.php';

            $appKey = bin2hex(random_bytes(16));
            $envContent = "APP_ENV=production\nAPP_KEY={$appKey}\nAPP_URL=" . ($_POST['app_url'] ?? '') . "\nDB_DATABASE={$dbPath}\n";
            file_put_contents($backendPath . '/.env', $envContent);

            \Salon\Config::load($backendPath . '/.env');
            \Salon\Database\Connection::reset();
            \Salon\Database\Migrator::run();
            \Salon\Database\Migrator::seedDefaults();

            $pdo = \Salon\Database\Connection::get();
            $pdo->prepare('UPDATE salon_settings SET name = ? WHERE id = 1')->execute([$salonName]);

            $adminId = \Salon\Services\AuthService::createAdmin($adminName, $adminEmail, $adminPassword, 'super_admin');

            $pdo->prepare(
                'INSERT INTO staff (user_id, display_name, color_hex) VALUES (?, ?, ?)'
            )->execute([$adminId, $adminName, '#be185d']);

            $staffId = (int) $pdo->lastInsertId();
            $services = $pdo->query('SELECT id FROM services')->fetchAll();
            $ins = $pdo->prepare('INSERT INTO service_staff (service_id, staff_id) VALUES (?, ?)');
            foreach ($services as $s) {
                $ins->execute([$s['id'], $staffId]);
            }

            for ($d = 0; $d <= 6; $d++) {
                $isFriday = ($d === 5);
                $pdo->prepare(
                    'INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)'
                )->execute([
                    $staffId,
                    $d,
                    $isFriday ? '00:00' : '09:00',
                    $isFriday ? '00:00' : '21:00',
                ]);
            }

            file_put_contents($lockFile, date('c'));
            $success = true;
        } catch (Throwable $e) {
            $error = 'خطا در نصب: ' . $e->getMessage();
        }
    }
}

$issues = checkRequirements();
?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>نصب پلتفرم سالن زیبایی</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet">
    <style>body{font-family:Vazirmatn,sans-serif}</style>
</head>
<body class="bg-pink-50 min-h-screen flex items-center justify-center p-4">
<div class="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8">
    <h1 class="text-2xl font-bold text-pink-800 mb-2">نصب پلتفرم سالن</h1>
    <p class="text-gray-600 mb-6 text-sm">راه‌اندازی سریع برای سالن زیبایی شما</p>

    <?php if ($success): ?>
        <div class="bg-green-50 text-green-800 p-4 rounded-lg mb-4">نصب با موفقیت انجام شد!</div>
        <a href="/" class="block text-center bg-pink-600 text-white py-3 rounded-lg font-semibold hover:bg-pink-700">رفتن به وبسایت</a>
        <a href="/admin" class="block text-center mt-2 text-pink-600 py-2">ورود به پنل مدیریت</a>
    <?php elseif ($step === 1): ?>
        <h2 class="font-semibold mb-3">بررسی پیش‌نیازها</h2>
        <ul class="space-y-2 mb-6 text-sm">
            <li class="<?= version_compare(PHP_VERSION, '8.2.0', '>=') ? 'text-green-600' : 'text-red-600' ?>">
                PHP <?= PHP_VERSION ?> <?= version_compare(PHP_VERSION, '8.2.0', '>=') ? '✓' : '✗' ?>
            </li>
            <?php foreach (['pdo_sqlite', 'json', 'mbstring'] as $ext): ?>
            <li class="<?= extension_loaded($ext) ? 'text-green-600' : 'text-red-600' ?>">
                <?= $ext ?> <?= extension_loaded($ext) ? '✓' : '✗' ?>
            </li>
            <?php endforeach; ?>
            <li class="<?= is_writable($backendPath) || is_writable($storagePath) || @mkdir($storagePath, 0755, true) ? 'text-green-600' : 'text-red-600' ?>">
                پوشه storage قابل نوشتن
            </li>
        </ul>
        <?php if (empty($issues)): ?>
        <a href="?step=2" class="block text-center bg-pink-600 text-white py-3 rounded-lg font-semibold">ادامه</a>
        <?php else: ?>
        <p class="text-red-600 text-sm"><?= htmlspecialchars(implode(', ', $issues)) ?></p>
        <?php endif; ?>
    <?php else: ?>
        <?php if ($error): ?>
        <div class="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>
        <form method="post" action="?step=2" class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-1">نام سالن</label>
                <input name="salon_name" required class="w-full border rounded-lg px-3 py-2" placeholder="سالن رز">
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">آدرس سایت (اختیاری)</label>
                <input name="app_url" class="w-full border rounded-lg px-3 py-2" placeholder="https://example.com">
            </div>
            <hr>
            <div>
                <label class="block text-sm font-medium mb-1">نام مدیر</label>
                <input name="admin_name" required class="w-full border rounded-lg px-3 py-2">
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">ایمیل مدیر (ورود پنل)</label>
                <input name="admin_email" type="email" required class="w-full border rounded-lg px-3 py-2">
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">رمز عبور</label>
                <input name="admin_password" type="password" required minlength="6" class="w-full border rounded-lg px-3 py-2">
            </div>
            <button type="submit" class="w-full bg-pink-600 text-white py-3 rounded-lg font-semibold hover:bg-pink-700">نصب</button>
        </form>
    <?php endif; ?>
</div>
</body>
</html>
