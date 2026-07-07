<?php

declare(strict_types=1);

namespace Salon\Controllers;

use Salon\Database\Connection;
use Salon\Database\Migrator;
use Salon\Http\Request;
use Salon\Http\Response;
use Salon\Services\AvailabilityService;
use Salon\Services\BusinessHoursService;
use Salon\Services\StaffProfileService;
use Salon\Services\UploadService;

final class PublicController
{
    public static function settings(Request $req): void
    {
        Migrator::ensureSalonSettingsColumns();
        $pdo = Connection::get();
        $row = $pdo->query('SELECT * FROM salon_settings WHERE id = 1')->fetch();
        if ($row && isset($row['business_hours_json'])) {
            $fixed = BusinessHoursService::normalizeJson((string) $row['business_hours_json']);
            if ($fixed !== null && $fixed !== $row['business_hours_json']) {
                $pdo->prepare('UPDATE salon_settings SET business_hours_json = ?, updated_at = datetime("now") WHERE id = 1')->execute([$fixed]);
                $row['business_hours_json'] = $fixed;
            }
        }
        unset($row['id']);
        Response::json($row);
    }

    public static function landingSections(Request $req): void
    {
        $rows = Connection::get()->query(
            'SELECT id, type, sort_order, config_json FROM landing_sections WHERE is_visible = 1 ORDER BY sort_order'
        )->fetchAll();
        foreach ($rows as &$r) {
            $r['config'] = json_decode($r['config_json'], true);
            unset($r['config_json']);
        }
        Response::json($rows);
    }

    public static function services(Request $req): void
    {
        Migrator::ensureCategories();
        $pdo = Connection::get();
        $cats = $pdo->query('SELECT * FROM service_categories WHERE is_active = 1 ORDER BY sort_order')->fetchAll();
        $svcs = $pdo->query('SELECT * FROM services WHERE is_active = 1 ORDER BY name')->fetchAll();
        Response::json(['categories' => $cats, 'services' => $svcs]);
    }

    public static function staff(Request $req): void
    {
        Migrator::ensureMediaTables();
        $pdo = Connection::get();
        $serviceId = $req->query['service_id'] ?? null;
        if ($serviceId) {
            $stmt = $pdo->prepare(
                'SELECT s.* FROM staff s
                 JOIN service_staff ss ON ss.staff_id = s.id
                 WHERE ss.service_id = ? AND s.is_accepting_bookings = 1'
            );
            $stmt->execute([$serviceId]);
            Response::json(StaffProfileService::enrichList($stmt->fetchAll()));
            return;
        }
        $rows = $pdo->query('SELECT * FROM staff WHERE is_accepting_bookings = 1')->fetchAll();
        Response::json(StaffProfileService::enrichList($rows));
    }

    public static function staffDetail(Request $req, array $params): void
    {
        Migrator::ensureMediaTables();
        try {
            Response::json(StaffProfileService::getPublicProfile((int) $params['id']));
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 404);
        }
    }

    public static function gallery(Request $req): void
    {
        Migrator::ensureMediaTables();
        $rows = Connection::get()->query(
            'SELECT id, file_path, caption FROM gallery_images WHERE is_active = 1 ORDER BY sort_order, id'
        )->fetchAll();
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
