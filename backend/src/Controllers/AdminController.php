<?php

declare(strict_types=1);

namespace Salon\Controllers;

use Salon\Database\Connection;
use Salon\Http\Request;
use Salon\Http\Response;
use Salon\Services\AppointmentService;
use Salon\Services\AuthService;
use Salon\Services\BusinessHoursService;
use Salon\Services\NotificationService;
use Salon\Services\StaffProfileService;
use Salon\Services\UpdateService;
use Salon\Services\UploadService;
use Salon\SystemInfo;
use Salon\Tenant\FeatureGate;
use Salon\Tenant\TenantContext;

final class AdminController
{
    private static function sid(): int
    {
        return TenantContext::siteId();
    }

    /** اشتراک فعلی سایت و قابلیت‌های آن */
    public static function subscription(Request $req): void
    {
        $pdo = Connection::get();
        $site = TenantContext::site();
        $siteId = self::sid();

        $package = null;
        if (!empty($site['package_id'])) {
            $stmt = $pdo->prepare('SELECT name, description, price_monthly, price_yearly FROM packages WHERE id = ?');
            $stmt->execute([(int) $site['package_id']]);
            $row = $stmt->fetch();
            if ($row) {
                $package = [
                    'name' => $row['name'],
                    'description' => $row['description'],
                    'price_monthly' => (int) $row['price_monthly'],
                    'price_yearly' => (int) $row['price_yearly'],
                ];
            }
        }

        $enabled = FeatureGate::enabledKeys($siteId);
        $allFeatures = $pdo->query('SELECT feature_key, name, description FROM features ORDER BY sort_order, id')->fetchAll();
        $features = array_map(static fn ($f) => [
            'key' => $f['feature_key'],
            'name' => $f['name'],
            'description' => $f['description'],
            'enabled' => in_array($f['feature_key'], $enabled, true),
        ], $allFeatures);

        $subStmt = $pdo->prepare('SELECT period, amount, starts_at, expires_at FROM subscriptions WHERE site_id = ? ORDER BY id DESC LIMIT 1');
        $subStmt->execute([$siteId]);
        $sub = $subStmt->fetch() ?: null;

        Response::json([
            'package' => $package,
            'status' => $site['status'] ?? 'active',
            'expires_at' => $site['expires_at'] ?? null,
            'subscription' => $sub ?: null,
            'features' => $features,
            'enabled_count' => count(array_filter($features, static fn ($f) => $f['enabled'])),
            'total_count' => count($features),
        ]);
    }

    public static function dashboard(Request $req): void
    {
        $pdo = Connection::get();
        $sid = self::sid();
        $today = date('Y-m-d');
        $todayCount = $pdo->prepare('SELECT COUNT(*) FROM appointments WHERE site_id = ? AND DATE(start_at) = DATE(?) AND status NOT IN ("cancelled")');
        $todayCount->execute([$sid, $today]);
        $pending = $pdo->prepare('SELECT COUNT(*) FROM appointments WHERE site_id = ? AND status = "pending"');
        $pending->execute([$sid]);
        $customers = $pdo->prepare('SELECT COUNT(*) FROM users WHERE site_id = ? AND role = "customer"');
        $customers->execute([$sid]);
        Response::json([
            'appointments_today' => (int) $todayCount->fetchColumn(),
            'pending' => (int) $pending->fetchColumn(),
            'customers' => (int) $customers->fetchColumn(),
        ]);
    }

    public static function appointments(Request $req): void
    {
        $filters = [];
        if ($req->user['role'] === 'staff') {
            $staff = Connection::get()->prepare('SELECT id FROM staff WHERE user_id = ? AND site_id = ?');
            $staff->execute([$req->user['id'], self::sid()]);
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

        if (($req->user['role'] ?? '') === 'staff') {
            $pdo = Connection::get();
            $stmt = $pdo->prepare('SELECT id FROM staff WHERE user_id = ? AND site_id = ?');
            $stmt->execute([(int) $req->user['id'], self::sid()]);
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
        $pdo = Connection::get();
        $sid = self::sid();
        $stmt = $pdo->prepare('SELECT * FROM salon_settings WHERE site_id = ?');
        $stmt->execute([$sid]);
        $row = $stmt->fetch();
        if ($row && isset($row['business_hours_json'])) {
            $fixed = BusinessHoursService::normalizeJson((string) $row['business_hours_json']);
            if ($fixed !== null && $fixed !== $row['business_hours_json']) {
                $pdo->prepare('UPDATE salon_settings SET business_hours_json = ?, updated_at = NOW() WHERE site_id = ?')->execute([$fixed, $sid]);
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
        $fields = ['name', 'phone', 'address', 'primary_color', 'secondary_color', 'accent_color',
            'font_family', 'hero_title', 'hero_subtitle', 'hero_image', 'logo_path', 'about_html',
            'social_links_json', 'business_hours_json', 'booking_rules_json', 'is_booking_enabled',
            'deposit_enabled', 'default_deposit_percent'];
        $pdo = Connection::get();
        $sid = self::sid();
        if (array_key_exists('logo_path', $b) && ($b['logo_path'] === '' || $b['logo_path'] === null)) {
            $q = $pdo->prepare('SELECT logo_path FROM salon_settings WHERE site_id = ?');
            $q->execute([$sid]);
            $oldLogo = $q->fetchColumn();
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
        $sets[] = 'updated_at = NOW()';
        $vals[] = $sid;
        $pdo->prepare('UPDATE salon_settings SET ' . implode(', ', $sets) . ' WHERE site_id = ?')->execute($vals);
        $stmt = $pdo->prepare('SELECT * FROM salon_settings WHERE site_id = ?');
        $stmt->execute([$sid]);
        Response::json($stmt->fetch());
    }

    public static function landingSections(Request $req): void
    {
        $stmt = Connection::get()->prepare('SELECT * FROM landing_sections WHERE site_id = ? ORDER BY sort_order');
        $stmt->execute([self::sid()]);
        Response::json($stmt->fetchAll());
    }

    public static function updateLandingSection(Request $req, array $params): void
    {
        $id = (int) $params['id'];
        $sid = self::sid();
        $b = $req->body;
        $config = isset($b['config']) ? json_encode($b['config'], JSON_UNESCAPED_UNICODE) : ($b['config_json'] ?? null);
        $pdo = Connection::get();
        if ($config !== null) {
            $pdo->prepare('UPDATE landing_sections SET config_json = ? WHERE id = ? AND site_id = ?')->execute([$config, $id, $sid]);
        }
        if (isset($b['is_visible'])) {
            $pdo->prepare('UPDATE landing_sections SET is_visible = ? WHERE id = ? AND site_id = ?')->execute([(int) $b['is_visible'], $id, $sid]);
        }
        if (isset($b['sort_order'])) {
            $pdo->prepare('UPDATE landing_sections SET sort_order = ? WHERE id = ? AND site_id = ?')->execute([(int) $b['sort_order'], $id, $sid]);
        }
        Response::json(['ok' => true]);
    }

    public static function services(Request $req): void
    {
        $pdo = Connection::get();
        $sid = self::sid();
        $cats = $pdo->prepare('SELECT * FROM service_categories WHERE site_id = ? ORDER BY sort_order');
        $cats->execute([$sid]);
        $svcs = $pdo->prepare('SELECT * FROM services WHERE site_id = ? ORDER BY name');
        $svcs->execute([$sid]);
        Response::json([
            'categories' => $cats->fetchAll(),
            'services' => $svcs->fetchAll(),
        ]);
    }

    public static function saveService(Request $req, array $params = []): void
    {
        $b = $req->body;
        $pdo = Connection::get();
        $sid = self::sid();
        if (!empty($params['id'])) {
            $pdo->prepare(
                'UPDATE services SET category_id=?, name=?, description=?, duration_minutes=?, price=?, price_type=?, deposit_percent=?, is_active=? WHERE id=? AND site_id=?'
            )->execute([
                $b['category_id'] ?? null, $b['name'], $b['description'] ?? '',
                (int) $b['duration_minutes'], (float) $b['price'], $b['price_type'] ?? 'fixed',
                (int) ($b['deposit_percent'] ?? 0), (int) ($b['is_active'] ?? 1), (int) $params['id'], $sid,
            ]);
            Response::json(['id' => (int) $params['id']]);
        } else {
            $pdo->prepare(
                'INSERT INTO services (site_id, category_id, name, description, duration_minutes, price, price_type, deposit_percent, is_active) VALUES (?,?,?,?,?,?,?,?,?)'
            )->execute([
                $sid, $b['category_id'] ?? null, $b['name'], $b['description'] ?? '',
                (int) $b['duration_minutes'], (float) $b['price'], $b['price_type'] ?? 'fixed',
                (int) ($b['deposit_percent'] ?? 0), (int) ($b['is_active'] ?? 1),
            ]);
            Response::json(['id' => (int) $pdo->lastInsertId()], 201);
        }
    }

    public static function deleteService(Request $req, array $params): void
    {
        Connection::get()->prepare('DELETE FROM services WHERE id = ? AND site_id = ?')->execute([(int) $params['id'], self::sid()]);
        Response::json(['ok' => true]);
    }

    public static function saveCategory(Request $req, array $params = []): void
    {
        $b = $req->body;
        $pdo = Connection::get();
        $sid = self::sid();
        if (!empty($params['id'])) {
            $pdo->prepare('UPDATE service_categories SET name=?, sort_order=?, is_active=? WHERE id=? AND site_id=?')
                ->execute([$b['name'], (int) ($b['sort_order'] ?? 0), (int) ($b['is_active'] ?? 1), (int) $params['id'], $sid]);
            Response::json(['id' => (int) $params['id']]);
        } else {
            $pdo->prepare('INSERT INTO service_categories (site_id, name, sort_order, is_active) VALUES (?,?,?,?)')
                ->execute([$sid, $b['name'], (int) ($b['sort_order'] ?? 0), (int) ($b['is_active'] ?? 1)]);
            Response::json(['id' => (int) $pdo->lastInsertId()], 201);
        }
    }

    public static function staffList(Request $req): void
    {
        $pdo = Connection::get();
        $sid = self::sid();
        if (($req->user['role'] ?? '') === 'staff') {
            $stmt = $pdo->prepare(
                'SELECT s.*, u.email, u.phone FROM staff s LEFT JOIN users u ON u.id = s.user_id WHERE s.site_id = ? AND s.user_id = ?'
            );
            $stmt->execute([$sid, (int) $req->user['id']]);
            $staff = $stmt->fetchAll();
        } else {
            $stmt = $pdo->prepare(
                'SELECT s.*, u.email, u.phone FROM staff s LEFT JOIN users u ON u.id = s.user_id WHERE s.site_id = ?'
            );
            $stmt->execute([$sid]);
            $staff = $stmt->fetchAll();
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
        $sid = self::sid();
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
                    unset($b['service_ids'], $b['satisfaction_percent']);
                }
                $pdo->prepare(
                    'UPDATE staff SET display_name=?, bio=?, color_hex=?, is_accepting_bookings=?, satisfaction_percent=? WHERE id=? AND site_id=?'
                )->execute([
                    $b['display_name'],
                    $b['bio'] ?? '',
                    $b['color_hex'] ?? '#be185d',
                    self::acceptingForSave($pdo, $req->user, $staffId, $b),
                    self::satisfactionForSave($pdo, $req->user, $staffId, $b),
                    $staffId,
                    $sid,
                ]);
            } else {
                // محدودیت تعداد پرسنل برای پکیج‌های بدون قابلیت «پرسنل نامحدود» (مثل پرو: حداکثر ۳)
                if (!\Salon\Tenant\FeatureGate::has('unlimited_staff')) {
                    $cnt = $pdo->prepare('SELECT COUNT(*) FROM staff WHERE site_id = ?');
                    $cnt->execute([$sid]);
                    if ((int) $cnt->fetchColumn() >= 3) {
                        $pdo->rollBack();
                        Response::error('در پکیج فعلی حداکثر ۳ پرسنل مجاز است. برای پرسنل نامحدود پکیج را ارتقا دهید.', 403);
                    }
                }
                $userId = null;
                if (!empty($b['email']) && !empty($b['password'])) {
                    $userId = AuthService::createAdmin($b['display_name'], $b['email'], $b['password'], 'staff', $sid);
                }
                $pdo->prepare(
                    'INSERT INTO staff (site_id, user_id, display_name, bio, color_hex, is_accepting_bookings, satisfaction_percent) VALUES (?,?,?,?,?,?,?)'
                )->execute([
                    $sid, $userId, $b['display_name'], $b['bio'] ?? '', $b['color_hex'] ?? '#be185d',
                    (int) ($b['is_accepting_bookings'] ?? 1),
                    (int) ($b['satisfaction_percent'] ?? 98),
                ]);
                $staffId = (int) $pdo->lastInsertId();
            }
            if (isset($b['service_ids']) && is_array($b['service_ids'])) {
                $pdo->prepare('DELETE FROM service_staff WHERE staff_id = ?')->execute([$staffId]);
                $ins = $pdo->prepare('INSERT INTO service_staff (service_id, staff_id) VALUES (?, ?)');
                foreach ($b['service_ids'] as $sidv) {
                    $ins->execute([(int) $sidv, $staffId]);
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
        $stmt = Connection::get()->prepare(
            'SELECT u.id, u.name, u.phone, u.email, u.created_at, c.notes, c.birth_date, c.national_id
             FROM users u
             LEFT JOIN customers c ON c.user_id = u.id
             WHERE u.site_id = ? AND u.role = "customer"
             ORDER BY u.created_at DESC LIMIT 500'
        );
        $stmt->execute([self::sid()]);
        Response::json($stmt->fetchAll());
    }

    public static function updateCustomer(Request $req, array $params): void
    {
        $pdo = Connection::get();
        $id = (int) ($params['id'] ?? 0);
        $check = $pdo->prepare('SELECT id FROM users WHERE id = ? AND site_id = ? AND role = "customer"');
        $check->execute([$id, self::sid()]);
        if (!$check->fetch()) {
            Response::error('مشتری یافت نشد', 404);
            return;
        }

        $b = $req->body;
        if (isset($b['name']) || isset($b['email'])) {
            $fields = [];
            $vals = [];
            if (isset($b['name'])) {
                $fields[] = 'name = ?';
                $vals[] = trim((string) $b['name']);
            }
            if (array_key_exists('email', $b)) {
                $fields[] = 'email = ?';
                $vals[] = $b['email'] !== null && $b['email'] !== '' ? trim((string) $b['email']) : null;
            }
            if ($fields) {
                $vals[] = $id;
                $pdo->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($vals);
            }
        }

        $notes = array_key_exists('notes', $b) ? (string) $b['notes'] : null;
        $birth = array_key_exists('birth_date', $b) ? (string) $b['birth_date'] : null;
        $nationalId = array_key_exists('national_id', $b) ? trim((string) $b['national_id']) : null;

        $exists = $pdo->prepare('SELECT user_id FROM customers WHERE user_id = ?');
        $exists->execute([$id]);
        if ($exists->fetch()) {
            $sets = [];
            $vals = [];
            if (array_key_exists('notes', $b)) {
                $sets[] = 'notes = ?';
                $vals[] = $notes;
            }
            if (array_key_exists('birth_date', $b)) {
                $sets[] = 'birth_date = ?';
                $vals[] = $birth !== '' ? $birth : null;
            }
            if (array_key_exists('national_id', $b)) {
                $sets[] = 'national_id = ?';
                $vals[] = $nationalId !== '' ? $nationalId : null;
            }
            if ($sets) {
                $vals[] = $id;
                $pdo->prepare('UPDATE customers SET ' . implode(', ', $sets) . ' WHERE user_id = ?')->execute($vals);
            }
        } else {
            $pdo->prepare(
                'INSERT INTO customers (user_id, notes, birth_date, national_id) VALUES (?, ?, ?, ?)'
            )->execute([
                $id,
                $notes,
                $birth !== '' ? $birth : null,
                $nationalId !== '' ? $nationalId : null,
            ]);
        }

        $stmt = $pdo->prepare(
            'SELECT u.id, u.name, u.phone, u.email, u.created_at, c.notes, c.birth_date, c.national_id
             FROM users u LEFT JOIN customers c ON c.user_id = u.id WHERE u.id = ?'
        );
        $stmt->execute([$id]);
        Response::json($stmt->fetch());
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
        $stmt = Connection::get()->prepare(
            'SELECT * FROM gallery_images WHERE site_id = ? ORDER BY sort_order, id DESC'
        );
        $stmt->execute([self::sid()]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['url'] = UploadService::publicUrl($r['file_path']);
        }
        Response::json($rows);
    }

    public static function uploadGallery(Request $req): void
    {
        if (empty($_FILES['image'])) {
            Response::error('فایل تصویر ارسال نشده');
        }
        try {
            $sid = self::sid();
            $path = UploadService::saveUploadedImage($_FILES['image'], $sid . '/gallery');
            $caption = trim((string) ($_POST['caption'] ?? ''));
            $pdo = Connection::get();
            $max = $pdo->prepare('SELECT COALESCE(MAX(sort_order), 0) FROM gallery_images WHERE site_id = ?');
            $max->execute([$sid]);
            $pdo->prepare('INSERT INTO gallery_images (site_id, file_path, caption, sort_order) VALUES (?,?,?,?)')
                ->execute([$sid, $path, $caption, (int) $max->fetchColumn() + 1]);
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
        $pdo = Connection::get();
        $id = (int) $params['id'];
        $stmt = $pdo->prepare('SELECT file_path FROM gallery_images WHERE id = ? AND site_id = ?');
        $stmt->execute([$id, self::sid()]);
        $row = $stmt->fetch();
        if (!$row) {
            Response::error('تصویر یافت نشد', 404);
        }
        UploadService::deleteByPath($row['file_path']);
        $pdo->prepare('DELETE FROM gallery_images WHERE id = ? AND site_id = ?')->execute([$id, self::sid()]);
        Response::json(['ok' => true]);
    }

    public static function uploadHero(Request $req): void
    {
        if (empty($_FILES['image'])) {
            Response::error('فایل تصویر ارسال نشده');
        }
        try {
            $sid = self::sid();
            $path = UploadService::saveUploadedImage($_FILES['image'], $sid . '/hero');
            $pdo = Connection::get();
            $q = $pdo->prepare('SELECT hero_image FROM salon_settings WHERE site_id = ?');
            $q->execute([$sid]);
            $old = $q->fetchColumn();
            UploadService::deleteByPath(is_string($old) ? $old : null);
            $pdo->prepare('UPDATE salon_settings SET hero_image = ?, updated_at = NOW() WHERE site_id = ?')
                ->execute([$path, $sid]);
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
            $sid = self::sid();
            $path = UploadService::saveUploadedImage($_FILES['image'], $sid . '/logo');
            $pdo = Connection::get();
            $q = $pdo->prepare('SELECT logo_path FROM salon_settings WHERE site_id = ?');
            $q->execute([$sid]);
            $old = $q->fetchColumn();
            UploadService::deleteByPath(is_string($old) ? $old : null);
            $pdo->prepare('UPDATE salon_settings SET logo_path = ?, updated_at = NOW() WHERE site_id = ?')
                ->execute([$path, $sid]);
            Response::json(['logo_path' => $path, 'url' => UploadService::publicUrl($path)]);
        } catch (\Throwable $e) {
            Response::error($e->getMessage());
        }
    }

    public static function uploadStaffAvatar(Request $req, array $params): void
    {
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
            $sid = self::sid();
            $path = UploadService::saveUploadedImage($_FILES['image'], $sid . '/avatars');
            $pdo = Connection::get();
            $stmt = $pdo->prepare('SELECT avatar_path FROM staff WHERE id = ? AND site_id = ?');
            $stmt->execute([$staffId, $sid]);
            $old = $stmt->fetchColumn();
            UploadService::deleteByPath(is_string($old) ? $old : null);
            $pdo->prepare('UPDATE staff SET avatar_path = ? WHERE id = ? AND site_id = ?')->execute([$path, $staffId, $sid]);
            Response::json(['avatar_path' => $path, 'url' => UploadService::publicUrl($path)]);
        } catch (\Throwable $e) {
            Response::error($e->getMessage());
        }
    }

    public static function staffPortfolio(Request $req, array $params): void
    {
        $staffId = (int) $params['id'];
        try {
            StaffProfileService::assertCanManageStaff($req->user, $staffId);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 403);
        }
        $stmt = Connection::get()->prepare(
            'SELECT * FROM staff_portfolio WHERE staff_id = ? AND site_id = ? ORDER BY sort_order, id'
        );
        $stmt->execute([$staffId, self::sid()]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['url'] = UploadService::publicUrl($r['file_path']);
        }
        Response::json($rows);
    }

    public static function uploadStaffPortfolio(Request $req, array $params): void
    {
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
            $sid = self::sid();
            $path = UploadService::saveUploadedImage($_FILES['image'], $sid . '/portfolio/' . $staffId);
            $caption = trim((string) ($_POST['caption'] ?? ''));
            $pdo = Connection::get();
            $max = $pdo->prepare('SELECT COALESCE(MAX(sort_order), 0) FROM staff_portfolio WHERE staff_id = ?');
            $max->execute([$staffId]);
            $order = (int) $max->fetchColumn() + 1;
            $pdo->prepare('INSERT INTO staff_portfolio (site_id, staff_id, file_path, caption, sort_order) VALUES (?,?,?,?,?)')
                ->execute([$sid, $staffId, $path, $caption, $order]);
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
        $staffId = (int) $params['id'];
        $itemId = (int) $params['itemId'];
        try {
            StaffProfileService::assertCanManageStaff($req->user, $staffId);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 403);
        }

        $caption = trim((string) ($req->body['caption'] ?? ''));
        $pdo = Connection::get();
        $stmt = $pdo->prepare('UPDATE staff_portfolio SET caption = ? WHERE id = ? AND staff_id = ? AND site_id = ?');
        $stmt->execute([$caption, $itemId, $staffId, self::sid()]);
        if ($stmt->rowCount() === 0) {
            Response::error('نمونه کار یافت نشد', 404);
        }
        Response::json(['ok' => true, 'id' => $itemId, 'caption' => $caption]);
    }

    public static function deleteStaffPortfolio(Request $req, array $params): void
    {
        $staffId = (int) $params['id'];
        $itemId = (int) $params['itemId'];
        try {
            StaffProfileService::assertCanManageStaff($req->user, $staffId);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 403);
        }
        $pdo = Connection::get();
        $stmt = $pdo->prepare('SELECT file_path FROM staff_portfolio WHERE id = ? AND staff_id = ? AND site_id = ?');
        $stmt->execute([$itemId, $staffId, self::sid()]);
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
