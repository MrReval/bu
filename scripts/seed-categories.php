<?php

declare(strict_types=1);

/** افزودن دسته‌های جدید به دیتابیس موجود: php scripts/seed-categories.php */

$backend = dirname(__DIR__) . '/backend';
require $backend . '/bootstrap.php';

Salon\Config::load($backend . '/.env');
Salon\Database\Migrator::ensureCategories(); // شامل خدمات نمونه برای دسته‌های خالی

echo "دسته‌بندی‌ها به‌روز شد:\n";
foreach (Salon\Database\Connection::get()->query('SELECT name, sort_order FROM service_categories ORDER BY sort_order') as $row) {
    echo "  - {$row['name']}\n";
}
