<?php

declare(strict_types=1);

namespace Salon\Services;

use Salon\Database\Connection;
use Salon\Tenant\TenantContext;

/**
 * حسابداری و گزارش درآمد بر پایه نوبت‌های «انجام‌شده».
 */
final class AccountingService
{
    /**
     * خلاصه درآمد در بازه‌ی زمانی، به‌همراه تفکیک ماهانه و پرسنل.
     * @return array<string,mixed>
     */
    public static function summary(?string $from, ?string $to, ?int $staffId): array
    {
        $pdo = Connection::get();
        $sid = TenantContext::siteId();

        $from = $from ?: date('Y-m-01');
        $to = $to ?: date('Y-m-d');
        $fromDt = $from . ' 00:00:00';
        $toDt = $to . ' 23:59:59';

        if ($staffId) {
            // درآمد به تفکیک خدمات همان پرسنل
            $stmt = $pdo->prepare(
                'SELECT
                    COALESCE(SUM(asv.price_snapshot), 0) AS revenue,
                    COUNT(DISTINCT a.id) AS appointments
                 FROM appointment_services asv
                 JOIN appointments a ON a.id = asv.appointment_id
                 WHERE a.site_id = ? AND a.status = "completed"
                   AND a.start_at BETWEEN ? AND ? AND asv.staff_id = ?'
            );
            $stmt->execute([$sid, $fromDt, $toDt, $staffId]);
            $totals = $stmt->fetch() ?: ['revenue' => 0, 'appointments' => 0];
            $deposits = 0;
        } else {
            $stmt = $pdo->prepare(
                'SELECT
                    COALESCE(SUM(total_price), 0) AS revenue,
                    COUNT(*) AS appointments,
                    COALESCE(SUM(CASE WHEN deposit_status = "paid" THEN deposit_amount ELSE 0 END), 0) AS deposits
                 FROM appointments
                 WHERE site_id = ? AND status = "completed" AND start_at BETWEEN ? AND ?'
            );
            $stmt->execute([$sid, $fromDt, $toDt]);
            $row = $stmt->fetch() ?: ['revenue' => 0, 'appointments' => 0, 'deposits' => 0];
            $totals = ['revenue' => $row['revenue'], 'appointments' => $row['appointments']];
            $deposits = $row['deposits'];
        }

        // تفکیک ماهانه (میلادی؛ برچسب شمسی در فرانت ساخته می‌شود)
        $monthStmt = $pdo->prepare(
            'SELECT DATE_FORMAT(start_at, "%Y-%m") AS ym,
                    COALESCE(SUM(total_price), 0) AS revenue,
                    COUNT(*) AS appointments
             FROM appointments
             WHERE site_id = ? AND status = "completed" AND start_at BETWEEN ? AND ?
             GROUP BY ym ORDER BY ym'
        );
        $monthStmt->execute([$sid, $fromDt, $toDt]);
        $byMonth = $monthStmt->fetchAll();

        // تفکیک پرسنل
        $staffStmt = $pdo->prepare(
            'SELECT s.id AS staff_id, s.display_name,
                    COALESCE(SUM(asv.price_snapshot), 0) AS revenue,
                    COUNT(DISTINCT a.id) AS appointments
             FROM appointment_services asv
             JOIN appointments a ON a.id = asv.appointment_id
             JOIN staff s ON s.id = asv.staff_id
             WHERE a.site_id = ? AND a.status = "completed" AND a.start_at BETWEEN ? AND ?
             GROUP BY asv.staff_id, s.display_name
             ORDER BY revenue DESC'
        );
        $staffStmt->execute([$sid, $fromDt, $toDt]);
        $byStaff = $staffStmt->fetchAll();

        return [
            'from' => $from,
            'to' => $to,
            'revenue' => (float) $totals['revenue'],
            'appointments' => (int) $totals['appointments'],
            'deposits' => (float) $deposits,
            'by_month' => array_map(static fn ($m) => [
                'ym' => $m['ym'],
                'revenue' => (float) $m['revenue'],
                'appointments' => (int) $m['appointments'],
            ], $byMonth),
            'by_staff' => array_map(static fn ($s) => [
                'staff_id' => (int) $s['staff_id'],
                'display_name' => $s['display_name'],
                'revenue' => (float) $s['revenue'],
                'appointments' => (int) $s['appointments'],
            ], $byStaff),
        ];
    }
}
