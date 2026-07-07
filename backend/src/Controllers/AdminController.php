<?php

declare(strict_types=1);

namespace Salon\Controllers;

use Salon\Database\Connection;
use Salon\Http\Request;
use Salon\Http\Response;
use Salon\Database\Migrator;
use Salon\Services\AppointmentService;
use Salon\Services\AuthService;
use Salon\Services\BusinessHoursService;
use Salon\Services\NotificationService;
use Salon\Services\StaffProfileService;
use Salon\Services\UpdateService;
use Salon\Services\UploadService;
use Salon\SystemInfo;

final class AdminController
{
    public static function dashboard(Request $req): void
    {
        $pdo = Connection::get();
        $today = date('Y-m-d');
        $todayCount = $pdo->prepare('SELECT COUNT(*) FROM appointments WHERE date(start_at) = date(?) AND status NOT IN ("cancelled")');
        $todayCount->execute([$today]);
        $pending = $pdo->query('SELECT COUNT(*) FROM appointments WHERE status = "pending"')->fetchColumn();
        $customers = $pdo->query('SELECT COUNT(*) FROM users WHERE role = "customer"')->fetchColumn();
        Response::json([
            'appointments_today' => (int) $todayCount->fetchColumn(),
            'pending' => (int) $pending,
            'customers' => (int) $customers,
        ]);
    }

    public static function appointments(Request $req): void
    {
        $filters = [];
        if ($req->user['role'] === 'staff') {
            $staff = Connection::get()->prepare('SELECT id FROM staff WHERE user_id = ?');
            $staff->execute([$req->user['id']]);
            $s = $staff->fetch();
            if ($s) {
                $filters['staff_id'] = (int) $s['id'];
            }
        } elseif (!empty($req->query['staff_id'])) {
            $filters['staff_id'] = (int) $req->query['staff_id'];
        }
        if (!empty($req->query['date_from'])) {
            $filters['date_from'] = $req->query['date_from'];
        }
        if (!empty($req->query['date_to'])) {
            $filters['date_to'] = $req->query['date_to'];
        }
        if (!empty($req->query['status'])) {
            $filters['status'] = $req->query['status'];
        }
        Response::json(AppointmentService::list($filters));
    }

    public static function appointmentDetail(Request $req, array $params): void
    {
        $id = (int) ($params['id'] ?? 0);
        if ($id <= 0) {
            Response::error('شناسه نامعتبر');
        }

        // اگر کاربر staff باشد، فقط نوبت‌های مربوط به خودش را ببیند
        if (($req->user['role'] ?? '') === 'staff') {
            $pdo = Connection::get();
            $stmt = $pdo->prepare('SELECT id FROM staff WHERE user_id = ?');
            $stmt->execute([(int) $req->user['id']]);
            $staff = $stmt->fetch();
            if (!$staff) {
                Response::error('پرسنل یافت نشد', 403);
            }
            $staffId = (int) $staff['id'];
            $chk = $pdo->prepare(
                'SELECT 1 FROM appointment_services WHERE appointment_id = ? AND staff_id = ? LIMIT 1'
            );
            $chk->execute([$id, $staffId]);
            if (!$chk->fetchColumn()) {
                Response::error('اجازه دسترسی ندارید', 403);
            }
        }

        try {
            Response::json(AppointmentService::getById($id));
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 404);
        }
    }

    public static function updateAppointmentStatus(Request $req, array $params): void
    {
        $id = (int) $params['id'];
        $status = $req->body['status'] ?? '';
        try {
            Response::json(AppointmentService::updateStatus($id, $status, (int) $req->user['id']));
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage());
        }
    }

    public static function getSettings(Request $req): void
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
        Response::json($row);
    }

    public static function updateSettings(Request $req): void
    {
        $b = $req->body;
        if (array_key_exists('business_hours_json', $b)) {
            $normalized = BusinessHoursService::normalizeJson((string) $b['business_hours_json']);
            if ($normalized !== null) {
                $b['business_hours_json'] = $normalized;
            }
        }
        Migrator::ensureSalonSettingsColumns();
        $fields = ['name', 'phone', 'address', 'primary_color', 'secondary_color', 'accent_color',
            'font_family', 'hero_title', 'hero_subtitle', 'hero_image', 'logo_path', 'about_html',
            'social_links_json', 'business_hours_json', 'booking_rules_json', 'is_booking_enabled'];
        $pdo = Connection::get();
        if (array_key_exists('logo_path', $b) && ($b['logo_path'] === '' || $b['logo_path'] === null)) {
            $oldLogo = $pdo->query('SELECT logo_path FROM salon_settings WHERE id = 1')->fetchColumn();
            UploadService::deleteByPath(is_string($oldLogo) ? $oldLogo : null);
        }
        $sets = [];
        $vals = [];
        foreach ($fields as $f) {
            if (array_key_exists($f, $b)) {
                $val = $b[$f];
                if (is_array($val)) {
                    $val = json_encode($val, JSON_UNESCAPED_UNICODE);
                }
                $sets[] = "$f = ?";
                $vals[] = $val;
            }
        }
        if (empty($sets)) {
            Response::error('داده‌ای ارسال نشده');
        }
        $sets[] = 'updated_at = datetime("now")';
        $vals[] = 1;
        Connection::get()->prepare('UPDATE salon_settings SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);
        Response::json(Connection::get()->query('SELECT * FROM salon_settings WHERE id = 1')->fetch());
    }

    public static function landingSections(Request $req): void
    {
        $rows = Connection::get()->query('SELECT * FROM landing_sections ORDER BY sort_order')->fetchAll();
        Response::json($rows);
    }

    public static function updateLandingSection(Request $req, array $params): void
    {
        $id = (int) $params['id'];
        $b = $req->body;
        $config = isset($b['config']) ? json_encode($b['config'], JSON_UNESCAPED_UNICODE) : ($b['config_json'] ?? null);
        $pdo = Connection::get();
        if ($config !== null) {
            $pdo->prepare('UPDATE landing_sections SET config_json = ? WHERE id = ?')->execute([$config, $id]);
        }
        if (isset($b['is_visible'])) {
            $pdo->prepare('UPDATE landing_sections SET is_visible = ? WHERE id = ?')->execute([(int) $b['is_visible'], $id]);
        }
        if (isset($b['sort_order'])) {
            $pdo->prepare('UPDATE landing_sections SET sort_order = ? WHERE id = ?')->execute([(int) $b['sort_order'], $id]);
        }
        Response::json(['ok' => true]);
    }

    public static function services(Request $req): void
    {
        \Salon\Database\Migrator::ensureCategories();
        $pdo = Connection::get();
        Response::json([
            'categories' => $pdo->query('SELECT * FROM service_categories ORDER BY sort_order')->fetchAll(),
            'services' => $pdo->query('SELECT * FROM services ORDER BY name')->fetchAll(),
        ]);
    }

    public static function saveService(Request $req, array $params = []): void
    {
        $b = $req->body;
        $pdo = Connection::get();
        if (!empty($params['id'])) {
            $pdo->prepare(
                'UPDATE services SET category_id=?, name=?, description=?, duration_minutes=?, price=?, price_type=?, is_active=? WHERE id=?'
            )->execute([
                $b['category_id'] ?? null, $b['name'], $b['description'] ?? '',
                (int) $b['duration_minutes'], (float) $b['price'], $b['price_type'] ?? 'fixed',
                (int) ($b['is_active'] ?? 1), (int) $params['id'],
            ]);
            Response::json(['id' => (int) $params['id']]);
        } else {
            $pdo->prepare(
                'INSERT INTO services (category_id, name, description, duration_minutes, price, price_type, is_active) VALUES (?,?,?,?,?,?,?)'
            )->execute([
                $b['category_id'] ?? null, $b['name'], $b['description'] ?? '',
                (int) $b['duration_minutes'], (float) $b['price'], $b['price_type'] ?? 'fixed',
                (int) ($b['is_active'] ?? 1),
            ]);
            Response::json(['id' => (int) $pdo->lastInsertId()], 201);
        }
    }

    public static function deleteService(Request $req, array $params): void
    {
        Connection::get()->prepare('DELETE FROM services WHERE id = ?')->execute([(int) $params['id']]);
        Response::json(['ok' => true]);
    }

    public static function saveCategory(Request $req, array $params = []): void
    {
        $b = $req->body;
        $pdo = Connection::get();
        if (!empty($params['id'])) {
            $pdo->prepare('UPDATE service_categories SET name=?, sort_order=?, is_active=? WHERE id=?')
                ->execute([$b['name'], (int) ($b['sort_order'] ?? 0), (int) ($b['is_active'] ?? 1), (int) $params['id']]);
            Response::json(['id' => (int) $params['id']]);
        } else {
            $pdo->prepare('INSERT INTO service_categories (name, sort_order, is_active) VALUES (?,?,?)')
                ->execute([$b['name'], (int) ($b['sort_order'] ?? 0), (int) ($b['is_active'] ?? 1)]);
            Response::json(['id' => (int) $pdo->lastInsertId()], 201);
        }
    }

    public static function staffList(Request $req): void
    {
        Migrator::ensureMediaTables();
        $pdo = Connection::get();
        if (($req->user['role'] ?? '') === 'staff') {
            $stmt = $pdo->prepare(
                'SELECT s.*, u.email, u.phone FROM staff s LEFT JOIN users u ON u.id = s.user_id WHERE s.user_id = ?'
            );
            $stmt->execute([(int) $req->user['id']]);
            $staff = $stmt->fetchAll();
        } else {
            $staff = $pdo->query(
                'SELECT s.*, u.email, u.phone FROM staff s LEFT JOIN users u ON u.id = s.user_id'
            )->fetchAll();
        }
        foreach ($staff as &$s) {
            $stmt = $pdo->prepare('SELECT service_id FROM service_staff WHERE staff_id = ?');
            $stmt->execute([$s['id']]);
            $s['service_ids'] = array_column($stmt->fetchAll(), 'service_id');
            $p = $pdo->prepare('SELECT COUNT(*) FROM staff_portfolio WHERE staff_id = ?');
            $p->execute([$s['id']]);
            $s['portfolio_count'] = (int) $p->fetchColumn();
            $s['avatar_url'] = UploadService::publicUrl($s['avatar_path'] ?? null);
        }
        $staff = StaffProfileService::enrichList($staff);
        Response::json($staff);
    }

    public static function saveStaff(Request $req, array $params = []): void
    {
        $b = $req->body;
        $pdo = Connection::get();
        $pdo->beginTransaction();
        try {
            if (!empty($params['id'])) {
                $staffId = (int) $params['id'];
                if (($req->user['role'] ?? '') === 'staff') {
                    try {
                        StaffProfileService::assertCanManageStaff($req->user, $staffId);
                    } catch (\RuntimeException $e) {
                        Response::error($e->getMessage(), 403);
                    }
                    // پرسنل فقط حق ویرایش اطلاعات پروفایل خودش را دارد (نام/بیو/رنگ).
                    // فیلدهای مدیریتی مثل خدمات، پذیرش نوبت و رضایت از این مسیر قابل تغییر نیستند.
                    unset($b['service_ids'], $b['satisfaction_percent']);
                }
                $pdo->prepare(
                    'UPDATE staff SET display_name=?, bio=?, color_hex=?, is_accepting_bookings=?, satisfaction_percent=? WHERE id=?'
                )->execute([
                    $b['display_name'],
                    $b['bio'] ?? '',
                    $b['color_hex'] ?? '#be185d',
                    self::acceptingForSave($pdo, $req->user, $staffId, $b),
                    self::satisfactionForSave($pdo, $req->user, $staffId, $b),
                    $staffId,
                ]);
            } else {
                $userId = null;
                if (!empty($b['email']) && !empty($b['password'])) {
                    $userId = AuthService::createAdmin($b['display_name'], $b['email'], $b['password'], 'staff');
                    $pdo->prepare('UPDATE users SET role = "staff" WHERE id = ?')->execute([$userId]);
                }
                $pdo->prepare(
                    'INSERT INTO staff (user_id, display_name, bio, color_hex, is_accepting_bookings, satisfaction_percent) VALUES (?,?,?,?,?,?)'
                )->execute([
                    $userId, $b['display_name'], $b['bio'] ?? '', $b['color_hex'] ?? '#be185d',
                    (int) ($b['is_accepting_bookings'] ?? 1),
                    (int) ($b['satisfaction_percent'] ?? 98),
                ]);
                $staffId = (int) $pdo->lastInsertId();
            }
            if (isset($b['service_ids']) && is_array($b['service_ids'])) {
                $pdo->prepare('DELETE FROM service_staff WHERE staff_id = ?')->execute([$staffId]);
                $ins = $pdo->prepare('INSERT INTO service_staff (service_id, staff_id) VALUES (?, ?)');
                foreach ($b['service_ids'] as $sid) {
                    $ins->execute([(int) $sid, $staffId]);
                }
            }
            $pdo->commit();
            Response::json(['id' => $staffId]);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            Response::error($e->getMessage(), 500);
        }
    }

    public static function customers(Request $req): void
    {
        $rows = Connection::get()->query(
            'SELECT u.id, u.name, u.phone, u.email, u.created_at, c.notes FROM users u
             LEFT JOIN customers c ON c.user_id = u.id WHERE u.role = "customer" ORDER BY u.created_at DESC LIMIT 500'
        )->fetchAll();
        Response::json($rows);
    }

    public static function notifications(Request $req): void
    {
        Response::json(NotificationService::listForUser((int) $req->user['id']));
    }

    public static function markNotificationRead(Request $req, array $params): void
    {
        NotificationService::markRead((int) $params['id'], (int) $req->user['id']);
        Response::json(['ok' => true]);
    }

    public static function markAllNotificationsRead(Request $req): void
    {
        NotificationService::markAllRead((int) $req->user['id']);
        Response::json(['ok' => true]);
    }

    public static function createAppointment(Request $req): void
    {
        $b = $req->body;
        $b['staff_id_from_slot'] = $b['staff_id'] ?? null;
        try {
            $result = AppointmentService::create($b, (int) ($b['customer_id'] ?? 0) ?: null);
            Response::json($result, 201);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage());
        }
    }

    public static function systemInfo(Request $req): void
    {
        Response::json(SystemInfo::info());
    }

    public static function updateStatus(Request $req): void
    {
        Response::json(UpdateService::status());
    }

    public static function startUpdate(Request $req): void
    {
        Response::json(UpdateService::start());
    }

    public static function galleryList(Request $req): void
    {
        Migrator::ensureMediaTables();
        $rows = Connection::get()->query(
            'SELECT * FROM gallery_images ORDER BY sort_order, id DESC'
        )->fetchAll();
        foreach ($rows as &$r) {
            $r['url'] = UploadService::publicUrl($r['file_path']);
        }
        Response::json($rows);
    }

    public static function uploadGallery(Request $req): void
    {
        Migrator::ensureMediaTables();
        if (empty($_FILES['image'])) {
            Response::error('فایل تصویر ارسال نشده');
        }
        try {
            $path = UploadService::saveUploadedImage($_FILES['image'], 'gallery');
            $caption = trim((string) ($_POST['caption'] ?? ''));
            $pdo = Connection::get();
            $max = (int) $pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM gallery_images')->fetchColumn();
            $pdo->prepare('INSERT INTO gallery_images (file_path, caption, sort_order) VALUES (?,?,?)')
                ->execute([$path, $caption, $max + 1]);
            Response::json([
                'id' => (int) $pdo->lastInsertId(),
                'file_path' => $path,
                'url' => UploadService::publicUrl($path),
                'caption' => $caption,
            ], 201);
        } catch (\Throwable $e) {
            Response::error($e->getMessage());
        }
    }

    public static function deleteGallery(Request $req, array $params): void
    {
        Migrator::ensureMediaTables();
        $pdo = Connection::get();
        $id = (int) $params['id'];
        $stmt = $pdo->prepare('SELECT file_path FROM gallery_images WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            Response::error('تصویر یافت نشد', 404);
        }
        UploadService::deleteByPath($row['file_path']);
        $pdo->prepare('DELETE FROM gallery_images WHERE id = ?')->execute([$id]);
        Response::json(['ok' => true]);
    }

    public static function uploadHero(Request $req): void
    {
        if (empty($_FILES['image'])) {
            Response::error('فایل تصویر ارسال نشده');
        }
        try {
            Migrator::ensureSalonSettingsColumns();
            $path = UploadService::saveUploadedImage($_FILES['image'], 'hero');
            $pdo = Connection::get();
            $old = $pdo->query('SELECT hero_image FROM salon_settings WHERE id = 1')->fetchColumn();
            UploadService::deleteByPath(is_string($old) ? $old : null);
            $pdo->prepare('UPDATE salon_settings SET hero_image = ?, updated_at = datetime("now") WHERE id = 1')
                ->execute([$path]);
            Response::json(['hero_image' => $path, 'url' => UploadService::publicUrl($path)]);
        } catch (\Throwable $e) {
            Response::error($e->getMessage());
        }
    }

    public static function uploadLogo(Request $req): void
    {
        if (empty($_FILES['image'])) {
            Response::error('فایل تصویر ارسال نشده');
        }
        try {
            Migrator::ensureSalonSettingsColumns();
            $path = UploadService::saveUploadedImage($_FILES['image'], 'logo');
            $pdo = Connection::get();
            $old = $pdo->query('SELECT logo_path FROM salon_settings WHERE id = 1')->fetchColumn();
            UploadService::deleteByPath(is_string($old) ? $old : null);
            $pdo->prepare('UPDATE salon_settings SET logo_path = ?, updated_at = datetime("now") WHERE id = 1')
                ->execute([$path]);
            Response::json(['logo_path' => $path, 'url' => UploadService::publicUrl($path)]);
        } catch (\Throwable $e) {
            Response::error($e->getMessage());
        }
    }

    public static function uploadStaffAvatar(Request $req, array $params): void
    {
        Migrator::ensureMediaTables();
        $staffId = (int) $params['id'];
        try {
            StaffProfileService::assertCanManageStaff($req->user, $staffId);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 403);
        }
        if (empty($_FILES['image'])) {
            Response::error('فایل تصویر ارسال نشده');
        }
        try {
            $path = UploadService::saveUploadedImage($_FILES['image'], 'avatars');
            $pdo = Connection::get();
            $stmt = $pdo->prepare('SELECT avatar_path FROM staff WHERE id = ?');
            $stmt->execute([$staffId]);
            $old = $stmt->fetchColumn();
            UploadService::deleteByPath(is_string($old) ? $old : null);
            $pdo->prepare('UPDATE staff SET avatar_path = ? WHERE id = ?')->execute([$path, $staffId]);
            Response::json(['avatar_path' => $path, 'url' => UploadService::publicUrl($path)]);
        } catch (\Throwable $e) {
            Response::error($e->getMessage());
        }
    }

    public static function staffPortfolio(Request $req, array $params): void
    {
        Migrator::ensureMediaTables();
        $staffId = (int) $params['id'];
        try {
            StaffProfileService::assertCanManageStaff($req->user, $staffId);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 403);
        }
        $stmt = Connection::get()->prepare(
            'SELECT * FROM staff_portfolio WHERE staff_id = ? ORDER BY sort_order, id'
        );
        $stmt->execute([$staffId]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['url'] = UploadService::publicUrl($r['file_path']);
        }
        Response::json($rows);
    }

    public static function uploadStaffPortfolio(Request $req, array $params): void
    {
        Migrator::ensureMediaTables();
        $staffId = (int) $params['id'];
        try {
            StaffProfileService::assertCanManageStaff($req->user, $staffId);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 403);
        }
        if (empty($_FILES['image'])) {
            Response::error('فایل تصویر ارسال نشده');
        }
        try {
            $path = UploadService::saveUploadedImage($_FILES['image'], 'portfolio/' . $staffId);
            $caption = trim((string) ($_POST['caption'] ?? ''));
            $pdo = Connection::get();
            $max = $pdo->prepare('SELECT COALESCE(MAX(sort_order), 0) FROM staff_portfolio WHERE staff_id = ?');
            $max->execute([$staffId]);
            $order = (int) $max->fetchColumn() + 1;
            $pdo->prepare('INSERT INTO staff_portfolio (staff_id, file_path, caption, sort_order) VALUES (?,?,?,?)')
                ->execute([$staffId, $path, $caption, $order]);
            Response::json([
                'id' => (int) $pdo->lastInsertId(),
                'file_path' => $path,
                'url' => UploadService::publicUrl($path),
                'caption' => $caption,
            ], 201);
        } catch (\Throwable $e) {
            Response::error($e->getMessage());
        }
    }

    public static function updateStaffPortfolio(Request $req, array $params): void
    {
        Migrator::ensureMediaTables();
        $staffId = (int) $params['id'];
        $itemId = (int) $params['itemId'];
        try {
            StaffProfileService::assertCanManageStaff($req->user, $staffId);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 403);
        }

        $caption = trim((string) ($req->body['caption'] ?? ''));
        $pdo = Connection::get();
        $stmt = $pdo->prepare('UPDATE staff_portfolio SET caption = ? WHERE id = ? AND staff_id = ?');
        $stmt->execute([$caption, $itemId, $staffId]);
        if ($stmt->rowCount() === 0) {
            Response::error('نمونه کار یافت نشد', 404);
        }
        Response::json(['ok' => true, 'id' => $itemId, 'caption' => $caption]);
    }

    public static function deleteStaffPortfolio(Request $req, array $params): void
    {
        Migrator::ensureMediaTables();
        $staffId = (int) $params['id'];
        $itemId = (int) $params['itemId'];
        try {
            StaffProfileService::assertCanManageStaff($req->user, $staffId);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 403);
        }
        $pdo = Connection::get();
        $stmt = $pdo->prepare('SELECT file_path FROM staff_portfolio WHERE id = ? AND staff_id = ?');
        $stmt->execute([$itemId, $staffId]);
        $row = $stmt->fetch();
        if (!$row) {
            Response::error('نمونه کار یافت نشد', 404);
        }
        UploadService::deleteByPath($row['file_path']);
        $pdo->prepare('DELETE FROM staff_portfolio WHERE id = ?')->execute([$itemId]);
        Response::json(['ok' => true]);
    }

    private static function satisfactionForSave(\PDO $pdo, array $user, int $staffId, array $body): int
    {
        if (in_array($user['role'] ?? '', ['super_admin', 'manager'], true)) {
            return (int) ($body['satisfaction_percent'] ?? 98);
        }
        $stmt = $pdo->prepare('SELECT satisfaction_percent FROM staff WHERE id = ?');
        $stmt->execute([$staffId]);

        return (int) ($stmt->fetchColumn() ?: 98);
    }

    private static function acceptingForSave(\PDO $pdo, array $user, int $staffId, array $body): int
    {
        if (in_array($user['role'] ?? '', ['super_admin', 'manager'], true)) {
            return (int) ($body['is_accepting_bookings'] ?? 1);
        }
        $stmt = $pdo->prepare('SELECT is_accepting_bookings FROM staff WHERE id = ?');
        $stmt->execute([$staffId]);

        return (int) ($stmt->fetchColumn() ?: 1);
    }
}
