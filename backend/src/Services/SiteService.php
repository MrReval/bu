<?php

declare(strict_types=1);

namespace Salon\Services;

use Salon\Database\Connection;
use Salon\Database\Migrator;
use Salon\Tenant\TenantResolver;

/**
 * ساخت و مدیریت سایت‌ها (سالن‌ها) توسط سوپرادمین.
 */
final class SiteService
{
    /**
     * ایجاد سایت جدید همراه با داده‌های اولیه و کاربر مدیر.
     * @return array<string,mixed> ردیف سایت ساخته‌شده
     */
    public static function create(array $data): array
    {
        $pdo = Connection::get();
        $name = trim($data['name'] ?? '');
        $domain = TenantResolver::normalizeHost($data['domain'] ?? '');
        $adminName = trim($data['admin_name'] ?? 'مدیر');
        $adminEmail = trim($data['admin_email'] ?? '');
        $adminPassword = (string) ($data['admin_password'] ?? '');
        $packageId = !empty($data['package_id']) ? (int) $data['package_id'] : null;
        // سایت‌ها ماهانه ساخته می‌شوند؛ اگر تاریخ انقضا داده نشود، یک ماه بعد محاسبه می‌شود
        $expiresAt = !empty($data['expires_at'])
            ? (string) $data['expires_at']
            : date('Y-m-d H:i:s', strtotime('+1 month'));

        if ($name === '' || $domain === '') {
            throw new \InvalidArgumentException('نام و دامنه الزامی است');
        }
        if ($adminEmail === '' || strlen($adminPassword) < 6) {
            throw new \InvalidArgumentException('ایمیل و رمز مدیر (حداقل ۶ کاراکتر) الزامی است');
        }

        $exists = $pdo->prepare('SELECT id FROM sites WHERE domain = ?');
        $exists->execute([$domain]);
        if ($exists->fetch()) {
            throw new \InvalidArgumentException('این دامنه قبلاً ثبت شده است');
        }

        $pdo->beginTransaction();
        try {
            $pdo->prepare(
                'INSERT INTO sites (name, domain, status, package_id, expires_at) VALUES (?, ?, "active", ?, ?)'
            )->execute([$name, $domain, $packageId, $expiresAt]);
            $siteId = (int) $pdo->lastInsertId();

            // داده‌های اولیه سالن
            Migrator::seedDefaults($siteId);
            $pdo->prepare('UPDATE salon_settings SET name = ? WHERE site_id = ?')->execute([$name, $siteId]);

            // کاربر مدیر سالن
            $adminId = AuthService::createAdmin($adminName, $adminEmail, $adminPassword, 'super_admin', $siteId, $data['admin_phone'] ?? null);

            // پرسنل پیش‌فرض به نام مدیر
            $pdo->prepare('INSERT INTO staff (site_id, user_id, display_name, color_hex) VALUES (?, ?, ?, ?)')
                ->execute([$siteId, $adminId, $adminName, '#be185d']);
            $staffId = (int) $pdo->lastInsertId();

            // آواتار و نمونه‌کار پیش‌فرض برای پرسنل مدیر
            Migrator::seedStaffMedia($siteId, $staffId);

            $svcStmt = $pdo->prepare('SELECT id FROM services WHERE site_id = ?');
            $svcStmt->execute([$siteId]);
            $ins = $pdo->prepare('INSERT INTO service_staff (service_id, staff_id) VALUES (?, ?)');
            foreach ($svcStmt->fetchAll() as $s) {
                $ins->execute([(int) $s['id'], $staffId]);
            }
            for ($d = 0; $d <= 6; $d++) {
                $isFriday = ($d === 5);
                $pdo->prepare('INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)')
                    ->execute([$staffId, $d, $isFriday ? '00:00' : '09:00', $isFriday ? '00:00' : '21:00']);
            }

            // ردیف‌های تنظیمات پیامک و پرداخت
            $pdo->prepare('INSERT INTO site_sms_settings (site_id) VALUES (?)')->execute([$siteId]);
            $pdo->prepare('INSERT INTO site_payment_settings (site_id) VALUES (?)')->execute([$siteId]);

            self::recordSubscription($siteId, $packageId, $data['period'] ?? 'monthly', $expiresAt);

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        return self::find($siteId);
    }

    public static function update(int $siteId, array $data): array
    {
        $pdo = Connection::get();
        $site = self::find($siteId);

        $fields = [];
        $vals = [];
        if (array_key_exists('name', $data)) {
            $fields[] = 'name = ?';
            $vals[] = trim((string) $data['name']);
        }
        if (array_key_exists('domain', $data)) {
            $domain = TenantResolver::normalizeHost($data['domain']);
            $dup = $pdo->prepare('SELECT id FROM sites WHERE domain = ? AND id <> ?');
            $dup->execute([$domain, $siteId]);
            if ($dup->fetch()) {
                throw new \InvalidArgumentException('این دامنه قبلاً ثبت شده است');
            }
            $fields[] = 'domain = ?';
            $vals[] = $domain;
        }
        if (array_key_exists('status', $data)) {
            $fields[] = 'status = ?';
            $vals[] = in_array($data['status'], ['active', 'suspended'], true) ? $data['status'] : 'active';
        }
        if (array_key_exists('package_id', $data)) {
            $fields[] = 'package_id = ?';
            $vals[] = !empty($data['package_id']) ? (int) $data['package_id'] : null;
        }
        if (array_key_exists('expires_at', $data)) {
            $fields[] = 'expires_at = ?';
            $vals[] = !empty($data['expires_at']) ? (string) $data['expires_at'] : null;
        }

        if (!empty($fields)) {
            $vals[] = $siteId;
            $pdo->prepare('UPDATE sites SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($vals);
        }

        if (array_key_exists('package_id', $data)) {
            self::recordSubscription($siteId, !empty($data['package_id']) ? (int) $data['package_id'] : null, $data['period'] ?? 'manual', $data['expires_at'] ?? null);
        }

        return self::find($siteId);
    }

    public static function delete(int $siteId): void
    {
        Connection::get()->prepare('DELETE FROM sites WHERE id = ?')->execute([$siteId]);
    }

    /** بازنشانی رمز مدیر سایت (اولین super_admin سایت) */
    public static function resetAdminPassword(int $siteId, string $newPassword): void
    {
        if (strlen($newPassword) < 6) {
            throw new \InvalidArgumentException('رمز حداقل ۶ کاراکتر');
        }
        $pdo = Connection::get();
        $stmt = $pdo->prepare('SELECT id FROM users WHERE site_id = ? AND role = "super_admin" ORDER BY id LIMIT 1');
        $stmt->execute([$siteId]);
        $userId = $stmt->fetchColumn();
        if (!$userId) {
            throw new \InvalidArgumentException('مدیر سایت یافت نشد');
        }
        $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
            ->execute([password_hash($newPassword, PASSWORD_DEFAULT), (int) $userId]);
    }

    public static function find(int $siteId): array
    {
        $stmt = Connection::get()->prepare('SELECT * FROM sites WHERE id = ?');
        $stmt->execute([$siteId]);
        $site = $stmt->fetch();
        if (!$site) {
            throw new \InvalidArgumentException('سایت یافت نشد');
        }
        return $site;
    }

    /** @return array<int,array<string,mixed>> */
    public static function all(): array
    {
        $pdo = Connection::get();
        $sites = $pdo->query(
            'SELECT s.*, p.name AS package_name,
                    (SELECT COUNT(*) FROM appointments a WHERE a.site_id = s.id) AS appointments_count,
                    (SELECT COUNT(*) FROM users u WHERE u.site_id = s.id AND u.role = "customer") AS customers_count
             FROM sites s LEFT JOIN packages p ON p.id = s.package_id
             ORDER BY s.created_at DESC'
        )->fetchAll();
        foreach ($sites as &$s) {
            $stmt = $pdo->prepare('SELECT email FROM users WHERE site_id = ? AND role = "super_admin" ORDER BY id LIMIT 1');
            $stmt->execute([(int) $s['id']]);
            $s['admin_email'] = $stmt->fetchColumn() ?: null;
        }
        return $sites;
    }

    private static function recordSubscription(int $siteId, ?int $packageId, string $period, ?string $expiresAt): void
    {
        if (!$packageId) {
            return;
        }
        $pdo = Connection::get();
        $amount = 0;
        $stmt = $pdo->prepare('SELECT price_monthly, price_yearly FROM packages WHERE id = ?');
        $stmt->execute([$packageId]);
        if ($pkg = $stmt->fetch()) {
            $amount = $period === 'yearly' ? (int) $pkg['price_yearly'] : (int) $pkg['price_monthly'];
        }
        $pdo->prepare(
            'INSERT INTO subscriptions (site_id, package_id, period, amount, expires_at) VALUES (?,?,?,?,?)'
        )->execute([$siteId, $packageId, $period, $amount, $expiresAt]);
    }
}
