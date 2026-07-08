<?php

declare(strict_types=1);

namespace Salon\Controllers;

use Salon\Database\Connection;
use Salon\Http\Request;
use Salon\Http\Response;
use Salon\Services\AvailabilityService;
use Salon\Services\BusinessHoursService;
use Salon\Services\StaffProfileService;
use Salon\Services\UploadService;
use Salon\Tenant\FeatureGate;
use Salon\Tenant\TenantContext;

final class PublicController
{
    private static function sid(): int
    {
        return TenantContext::siteId();
    }

    public static function settings(Request $req): void
    {
        $pdo = Connection::get();
        $sid = self::sid();
        $stmt = $pdo->prepare('SELECT * FROM salon_settings WHERE site_id = ?');
        $stmt->execute([$sid]);
        $row = $stmt->fetch();
        if (!$row) {
            Response::error('سالن یافت نشد', 404);
        }
        if (isset($row['business_hours_json'])) {
            $fixed = BusinessHoursService::normalizeJson((string) $row['business_hours_json']);
            if ($fixed !== null && $fixed !== $row['business_hours_json']) {
                $pdo->prepare('UPDATE salon_settings SET business_hours_json = ?, updated_at = NOW() WHERE site_id = ?')->execute([$fixed, $sid]);
                $row['business_hours_json'] = $fixed;
            }
        }
        unset($row['site_id']);
        $row['features'] = FeatureGate::enabledKeys();

        // آیا درگاه پرداخت فعال است (برای دریافت بیعانه)
        $pay = $pdo->prepare('SELECT is_enabled, enamad_code FROM site_payment_settings WHERE site_id = ?');
        $pay->execute([$sid]);
        $payRow = $pay->fetch() ?: [];
        $payEnabled = (bool) ($payRow['is_enabled'] ?? false) && FeatureGate::has('deposit');
        $row['payment_enabled'] = $payEnabled;
        // کد نماد اعتماد الکترونیکی فقط وقتی درگاه فعال است در فوتر نمایش داده می‌شود
        $row['enamad_code'] = $payEnabled ? (string) ($payRow['enamad_code'] ?? '') : '';

        Response::json($row);
    }

    public static function landingSections(Request $req): void
    {
        $stmt = Connection::get()->prepare(
            'SELECT id, type, sort_order, config_json FROM landing_sections WHERE site_id = ? AND is_visible = 1 ORDER BY sort_order'
        );
        $stmt->execute([self::sid()]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['config'] = json_decode($r['config_json'], true);
            unset($r['config_json']);
        }
        Response::json($rows);
    }

    public static function services(Request $req): void
    {
        $pdo = Connection::get();
        $sid = self::sid();
        $cats = $pdo->prepare('SELECT * FROM service_categories WHERE site_id = ? AND is_active = 1 ORDER BY sort_order');
        $cats->execute([$sid]);
        $svcs = $pdo->prepare('SELECT * FROM services WHERE site_id = ? AND is_active = 1 ORDER BY name');
        $svcs->execute([$sid]);
        Response::json(['categories' => $cats->fetchAll(), 'services' => $svcs->fetchAll()]);
    }

    public static function staff(Request $req): void
    {
        $pdo = Connection::get();
        $sid = self::sid();
        $serviceId = $req->query['service_id'] ?? null;
        if ($serviceId) {
            $stmt = $pdo->prepare(
                'SELECT s.* FROM staff s
                 JOIN service_staff ss ON ss.staff_id = s.id
                 WHERE s.site_id = ? AND ss.service_id = ? AND s.is_accepting_bookings = 1'
            );
            $stmt->execute([$sid, $serviceId]);
            Response::json(StaffProfileService::enrichList($stmt->fetchAll()));
            return;
        }
        $stmt = $pdo->prepare('SELECT * FROM staff WHERE site_id = ? AND is_accepting_bookings = 1');
        $stmt->execute([$sid]);
        Response::json(StaffProfileService::enrichList($stmt->fetchAll()));
    }

    public static function staffDetail(Request $req, array $params): void
    {
        try {
            Response::json(StaffProfileService::getPublicProfile((int) $params['id']));
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 404);
        }
    }

    public static function gallery(Request $req): void
    {
        $stmt = Connection::get()->prepare(
            'SELECT id, file_path, caption FROM gallery_images WHERE site_id = ? AND is_active = 1 ORDER BY sort_order, id'
        );
        $stmt->execute([self::sid()]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['url'] = UploadService::publicUrl($r['file_path']);
        }
        Response::json($rows);
    }

    public static function availability(Request $req): void
    {
        $ids = $req->query['service_ids'] ?? '';
        $serviceIds = array_filter(array_map('intval', explode(',', $ids)));
        $staffId = isset($req->query['staff_id']) ? (int) $req->query['staff_id'] : null;
        $date = $req->query['date'] ?? date('Y-m-d');

        if (empty($serviceIds)) {
            Response::error('service_ids الزامی است');
        }

        try {
            $slots = AvailabilityService::getSlots($serviceIds, $staffId ?: null, $date);
            Response::json(['slots' => $slots]);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage());
        }
    }
}
