<?php

declare(strict_types=1);

namespace Salon\Services;

use Salon\Database\Connection;
use Salon\Tenant\TenantContext;

final class StaffProfileService
{
    public static function enrichList(array $rows): array
    {
        $pdo = Connection::get();
        foreach ($rows as &$s) {
            $s = self::enrichOne($pdo, $s, false);
        }
        return $rows;
    }

    public static function getPublicProfile(int $id): array
    {
        $pdo = Connection::get();
        $stmt = $pdo->prepare('SELECT s.* FROM staff s WHERE s.id = ? AND s.site_id = ?');
        $stmt->execute([$id, TenantContext::siteId()]);
        $row = $stmt->fetch();
        if (!$row) {
            throw new \InvalidArgumentException('پرسنل یافت نشد');
        }
        return self::enrichOne($pdo, $row, true);
    }

    private static function enrichOne(\PDO $pdo, array $s, bool $withPortfolio): array
    {
        $id = (int) $s['id'];

        $stmt = $pdo->prepare('SELECT COUNT(*) FROM service_staff WHERE staff_id = ?');
        $stmt->execute([$id]);
        $s['services_count'] = (int) $stmt->fetchColumn();

        $stmt = $pdo->prepare(
            'SELECT COUNT(DISTINCT aps.appointment_id) FROM appointment_services aps
             JOIN appointments a ON a.id = aps.appointment_id
             WHERE aps.staff_id = ? AND a.status = "completed"'
        );
        $stmt->execute([$id]);
        $s['completed_jobs'] = (int) $stmt->fetchColumn();

        $s['satisfaction_percent'] = (int) ($s['satisfaction_percent'] ?? 98);
        $s['avatar_url'] = UploadService::publicUrl($s['avatar_path'] ?? null);

        if ($withPortfolio) {
            $p = $pdo->prepare(
                'SELECT id, file_path, caption, sort_order FROM staff_portfolio WHERE staff_id = ? ORDER BY sort_order, id'
            );
            $p->execute([$id]);
            $portfolio = $p->fetchAll();
            foreach ($portfolio as &$item) {
                $item['url'] = UploadService::publicUrl($item['file_path']);
            }
            $s['portfolio'] = $portfolio;

            $svc = $pdo->prepare(
                'SELECT sv.id, sv.name, sv.duration_minutes, sv.price
                 FROM services sv
                 JOIN service_staff ss ON ss.service_id = sv.id
                 WHERE ss.staff_id = ? AND sv.is_active = 1
                 ORDER BY sv.name'
            );
            $svc->execute([$id]);
            $s['services'] = $svc->fetchAll();
        }

        return $s;
    }

    public static function assertCanManageStaff(array $user, int $staffId): void
    {
        $role = $user['role'] ?? '';
        if (in_array($role, ['super_admin', 'manager'], true)) {
            return;
        }
        if ($role === 'staff') {
            $pdo = Connection::get();
            $stmt = $pdo->prepare('SELECT id FROM staff WHERE user_id = ? AND site_id = ?');
            $stmt->execute([(int) $user['id'], TenantContext::siteId()]);
            $own = $stmt->fetchColumn();
            if ($own && (int) $own === $staffId) {
                return;
            }
        }
        throw new \RuntimeException('اجازه دسترسی ندارید');
    }
}
