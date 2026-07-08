<?php

declare(strict_types=1);

namespace Salon\Services;

use Salon\Database\Connection;
use Salon\Tenant\TenantContext;

/**
 * حسابداری و گزارش درآمد بر پایه نوبت‌های «انجام‌شده».
 * شامل مقایسه با دوره قبل، روند روزانه، تفکیک ماه/پرسنل/خدمت و بیعانه‌ها.
 */
final class AccountingService
{
    /**
     * خلاصه‌ی جامع درآمد در بازه‌ی زمانی.
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
        $staffId = $staffId ?: null;

        // دوره‌ی قبلی هم‌طول برای مقایسه
        $len = max(1, (int) ((strtotime($to) - strtotime($from)) / 86400) + 1);
        $prevTo = date('Y-m-d', strtotime($from . ' -1 day'));
        $prevFrom = date('Y-m-d', strtotime($prevTo . ' -' . ($len - 1) . ' day'));
        $prevFromDt = $prevFrom . ' 00:00:00';
        $prevToDt = $prevTo . ' 23:59:59';

        // محاسبه‌ی درآمد/تعداد برای یک بازه (با در نظر گرفتن فیلتر پرسنل)
        $totalsFor = static function (string $f, string $t) use ($pdo, $sid, $staffId): array {
            if ($staffId) {
                $st = $pdo->prepare(
                    'SELECT COALESCE(SUM(asv.price_snapshot),0) rev, COUNT(DISTINCT a.id) cnt
                     FROM appointment_services asv
                     JOIN appointments a ON a.id = asv.appointment_id
                     WHERE a.site_id = ? AND a.status = "completed" AND a.start_at BETWEEN ? AND ? AND asv.staff_id = ?'
                );
                $st->execute([$sid, $f, $t, $staffId]);
            } else {
                $st = $pdo->prepare(
                    'SELECT COALESCE(SUM(total_price),0) rev, COUNT(*) cnt
                     FROM appointments WHERE site_id = ? AND status = "completed" AND start_at BETWEEN ? AND ?'
                );
                $st->execute([$sid, $f, $t]);
            }
            $r = $st->fetch() ?: ['rev' => 0, 'cnt' => 0];
            return ['revenue' => (float) $r['rev'], 'appointments' => (int) $r['cnt']];
        };

        $cur = $totalsFor($fromDt, $toDt);
        $prev = $totalsFor($prevFromDt, $prevToDt);
        $avgTicket = $cur['appointments'] > 0 ? $cur['revenue'] / $cur['appointments'] : 0.0;

        // بیعانه‌ها (سطح نوبت، مستقل از پرسنل)
        $depStmt = $pdo->prepare(
            'SELECT COALESCE(SUM(CASE WHEN deposit_status = "paid" THEN deposit_amount ELSE 0 END),0) paid,
                    COALESCE(SUM(CASE WHEN deposit_status = "pending" THEN deposit_amount ELSE 0 END),0) pending
             FROM appointments WHERE site_id = ? AND start_at BETWEEN ? AND ?'
        );
        $depStmt->execute([$sid, $fromDt, $toDt]);
        $dep = $depStmt->fetch() ?: ['paid' => 0, 'pending' => 0];

        $cancelled = (int) self::scalar($pdo, 'SELECT COUNT(*) FROM appointments WHERE site_id = ? AND status = "cancelled" AND start_at BETWEEN ? AND ?', [$sid, $fromDt, $toDt]);
        $newCustomers = (int) self::scalar($pdo, 'SELECT COUNT(*) FROM users WHERE site_id = ? AND role = "customer" AND created_at BETWEEN ? AND ?', [$sid, $fromDt, $toDt]);

        // تفکیک ماهانه
        if ($staffId) {
            $mStmt = $pdo->prepare(
                'SELECT DATE_FORMAT(a.start_at, "%Y-%m") ym, COALESCE(SUM(asv.price_snapshot),0) revenue, COUNT(DISTINCT a.id) appointments
                 FROM appointment_services asv JOIN appointments a ON a.id = asv.appointment_id
                 WHERE a.site_id = ? AND a.status = "completed" AND a.start_at BETWEEN ? AND ? AND asv.staff_id = ?
                 GROUP BY ym ORDER BY ym'
            );
            $mStmt->execute([$sid, $fromDt, $toDt, $staffId]);
        } else {
            $mStmt = $pdo->prepare(
                'SELECT DATE_FORMAT(start_at, "%Y-%m") ym, COALESCE(SUM(total_price),0) revenue, COUNT(*) appointments
                 FROM appointments WHERE site_id = ? AND status = "completed" AND start_at BETWEEN ? AND ?
                 GROUP BY ym ORDER BY ym'
            );
            $mStmt->execute([$sid, $fromDt, $toDt]);
        }
        $byMonth = $mStmt->fetchAll();

        // روند روزانه
        if ($staffId) {
            $dStmt = $pdo->prepare(
                'SELECT DATE(a.start_at) d, COALESCE(SUM(asv.price_snapshot),0) revenue, COUNT(DISTINCT a.id) appointments
                 FROM appointment_services asv JOIN appointments a ON a.id = asv.appointment_id
                 WHERE a.site_id = ? AND a.status = "completed" AND a.start_at BETWEEN ? AND ? AND asv.staff_id = ?
                 GROUP BY d ORDER BY d'
            );
            $dStmt->execute([$sid, $fromDt, $toDt, $staffId]);
        } else {
            $dStmt = $pdo->prepare(
                'SELECT DATE(start_at) d, COALESCE(SUM(total_price),0) revenue, COUNT(*) appointments
                 FROM appointments WHERE site_id = ? AND status = "completed" AND start_at BETWEEN ? AND ?
                 GROUP BY d ORDER BY d'
            );
            $dStmt->execute([$sid, $fromDt, $toDt]);
        }
        $byDay = $dStmt->fetchAll();

        // تفکیک پرسنل (همیشه همه‌ی پرسنل)
        $staffStmt = $pdo->prepare(
            'SELECT s.id AS staff_id, s.display_name,
                    COALESCE(SUM(asv.price_snapshot),0) revenue,
                    COUNT(DISTINCT a.id) appointments
             FROM appointment_services asv
             JOIN appointments a ON a.id = asv.appointment_id
             JOIN staff s ON s.id = asv.staff_id
             WHERE a.site_id = ? AND a.status = "completed" AND a.start_at BETWEEN ? AND ?
             GROUP BY asv.staff_id, s.display_name ORDER BY revenue DESC'
        );
        $staffStmt->execute([$sid, $fromDt, $toDt]);
        $byStaff = $staffStmt->fetchAll();

        // تفکیک خدمات (پرفروش‌ترین‌ها)
        $svcSql =
            'SELECT sv.name, COALESCE(SUM(asv.price_snapshot),0) revenue, COUNT(*) qty
             FROM appointment_services asv
             JOIN appointments a ON a.id = asv.appointment_id
             JOIN services sv ON sv.id = asv.service_id
             WHERE a.site_id = ? AND a.status = "completed" AND a.start_at BETWEEN ? AND ?';
        $svcParams = [$sid, $fromDt, $toDt];
        if ($staffId) {
            $svcSql .= ' AND asv.staff_id = ?';
            $svcParams[] = $staffId;
        }
        $svcSql .= ' GROUP BY asv.service_id, sv.name ORDER BY revenue DESC LIMIT 10';
        $svcStmt = $pdo->prepare($svcSql);
        $svcStmt->execute($svcParams);
        $byService = $svcStmt->fetchAll();

        return [
            'from' => $from,
            'to' => $to,
            'staff_id' => $staffId,
            'revenue' => $cur['revenue'],
            'appointments' => $cur['appointments'],
            'avg_ticket' => round($avgTicket),
            'deposits' => (float) $dep['paid'],
            'deposits_pending' => (float) $dep['pending'],
            'cancelled' => $cancelled,
            'new_customers' => $newCustomers,
            'prev' => [
                'revenue' => $prev['revenue'],
                'appointments' => $prev['appointments'],
            ],
            'by_month' => array_map(static fn ($m) => [
                'ym' => $m['ym'],
                'revenue' => (float) $m['revenue'],
                'appointments' => (int) $m['appointments'],
            ], $byMonth),
            'by_day' => array_map(static fn ($d) => [
                'date' => $d['d'],
                'revenue' => (float) $d['revenue'],
                'appointments' => (int) $d['appointments'],
            ], $byDay),
            'by_staff' => array_map(static fn ($s) => [
                'staff_id' => (int) $s['staff_id'],
                'display_name' => $s['display_name'],
                'revenue' => (float) $s['revenue'],
                'appointments' => (int) $s['appointments'],
            ], $byStaff),
            'by_service' => array_map(static fn ($s) => [
                'name' => $s['name'],
                'revenue' => (float) $s['revenue'],
                'qty' => (int) $s['qty'],
            ], $byService),
        ];
    }

    /** @param array<int,mixed> $params */
    private static function scalar(\PDO $pdo, string $sql, array $params): mixed
    {
        $st = $pdo->prepare($sql);
        $st->execute($params);
        return $st->fetchColumn();
    }
}
