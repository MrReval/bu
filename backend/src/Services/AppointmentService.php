<?php

declare(strict_types=1);

namespace Salon\Services;

use Salon\Database\Connection;
use Salon\Tenant\TenantContext;

final class AppointmentService
{
    public static function create(array $data, ?int $customerId = null): array
    {
        $pdo = Connection::get();
        $siteId = TenantContext::siteId();
        $stmt = $pdo->prepare('SELECT * FROM salon_settings WHERE site_id = ?');
        $stmt->execute([$siteId]);
        $settings = $stmt->fetch();
        if (!$settings || !(int) $settings['is_booking_enabled']) {
            throw new \InvalidArgumentException('رزرو آنلاین غیرفعال است');
        }

        $rules = json_decode($settings['booking_rules_json'] ?? '{}', true) ?: [];
        $serviceIds = array_values(array_unique(array_map('intval', $data['service_ids'] ?? [])));
        $staffId = isset($data['staff_id']) ? (int) $data['staff_id'] : null;
        $startAt = $data['start_at'] ?? '';
        $notes = trim($data['notes_customer'] ?? '');

        if (empty($serviceIds) || $startAt === '') {
            throw new \InvalidArgumentException('خدمات و زمان الزامی است');
        }

        $multiService = array_key_exists('multi_service', $rules)
            ? (bool) $rules['multi_service']
            : true;
        if (!$multiService && count($serviceIds) > 1) {
            throw new \InvalidArgumentException('در این مجموعه فقط یک خدمت در هر نوبت مجاز است');
        }

        if (!$customerId) {
            $name = trim($data['name'] ?? '');
            $phone = trim($data['phone'] ?? '');
            $password = $data['password'] ?? bin2hex(random_bytes(4));
            if ($name === '' || $phone === '') {
                throw new \InvalidArgumentException('نام و موبایل الزامی است');
            }
            $existing = $pdo->prepare('SELECT id FROM users WHERE site_id = ? AND phone = ?');
            $existing->execute([$siteId, $phone]);
            $row = $existing->fetch();
            if ($row) {
                $customerId = (int) $row['id'];
            } else {
                $auth = AuthService::register([
                    'name' => $name,
                    'phone' => $phone,
                    'password' => $password,
                ]);
                $customerId = (int) $auth['user']['id'];
            }
        }

        $ph = implode(',', array_fill(0, count($serviceIds), '?'));
        $stmt = $pdo->prepare("SELECT * FROM services WHERE site_id = ? AND id IN ($ph)");
        $stmt->execute(array_merge([$siteId], $serviceIds));
        $services = $stmt->fetchAll();
        if (empty($services)) {
            throw new \InvalidArgumentException('خدمات نامعتبر');
        }
        $totalDuration = array_sum(array_column($services, 'duration_minutes'));
        $totalPrice = array_sum(array_column($services, 'price'));

        $depositAmount = self::calcDeposit($services, $settings);
        $depositStatus = $depositAmount > 0 ? 'pending' : 'none';

        $start = new \DateTime($startAt);
        $end = (clone $start)->modify("+{$totalDuration} minutes");

        if (!$staffId && !empty($data['staff_id_from_slot'])) {
            $staffId = (int) $data['staff_id_from_slot'];
        }

        if (!empty($rules['staff_selection_required']) && !$staffId) {
            throw new \InvalidArgumentException('انتخاب پرسنل / پزشک برای این نوبت الزامی است');
        }

        $autoConfirm = !empty($rules['auto_confirm']);
        // تا وقتی بیعانه پرداخت/تأیید نشده، نوبت نهایی نشود
        $status = ($depositAmount > 0) ? 'pending' : ($autoConfirm ? 'confirmed' : 'pending');

        $pdo->beginTransaction();
        try {
            $pdo->prepare(
                'INSERT INTO appointments (site_id, customer_id, status, start_at, end_at, total_price, deposit_amount, deposit_status, notes_customer, source)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "web")'
            )->execute([
                $siteId,
                $customerId,
                $status,
                $start->format('Y-m-d H:i:s'),
                $end->format('Y-m-d H:i:s'),
                $totalPrice,
                $depositAmount,
                $depositStatus,
                $notes,
            ]);
            $appointmentId = (int) $pdo->lastInsertId();

            $sort = 0;
            foreach ($services as $svc) {
                $pdo->prepare(
                    'INSERT INTO appointment_services (appointment_id, service_id, staff_id, duration_minutes, price_snapshot, sort_order)
                     VALUES (?, ?, ?, ?, ?, ?)'
                )->execute([
                    $appointmentId,
                    $svc['id'],
                    $staffId,
                    $svc['duration_minutes'],
                    $svc['price'],
                    $sort++,
                ]);
            }

            $pdo->prepare(
                'INSERT INTO appointment_status_history (appointment_id, old_status, new_status, changed_by)
                 VALUES (?, NULL, ?, ?)'
            )->execute([$appointmentId, $status, $customerId]);

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        if ($staffId) {
            NotificationService::notifyStaffNewAppointment($appointmentId, $staffId);
        } else {
            NotificationService::notifyManagersNewAppointment($appointmentId);
        }
        SmsService::onNewAppointment($appointmentId);

        return self::getById($appointmentId);
    }

    /** محاسبه بیعانه بر اساس درصد سرویس یا پیش‌فرض سالن */
    private static function calcDeposit(array $services, array $settings): float
    {
        if (empty($settings['deposit_enabled'])) {
            return 0.0;
        }
        $default = (int) ($settings['default_deposit_percent'] ?? 0);
        $total = 0.0;
        foreach ($services as $svc) {
            $percent = (int) ($svc['deposit_percent'] ?? 0);
            if ($percent <= 0) {
                $percent = $default;
            }
            if ($percent > 0) {
                $total += ((float) $svc['price']) * $percent / 100;
            }
        }
        return round($total);
    }

    public static function getById(int $id): array
    {
        $pdo = Connection::get();
        $siteId = TenantContext::siteId();
        $stmt = $pdo->prepare(
            'SELECT a.*, u.name as customer_name, u.phone as customer_phone
             FROM appointments a JOIN users u ON u.id = a.customer_id WHERE a.id = ? AND a.site_id = ?'
        );
        $stmt->execute([$id, $siteId]);
        $apt = $stmt->fetch();
        if (!$apt) {
            throw new \InvalidArgumentException('نوبت یافت نشد');
        }
        $stmt = $pdo->prepare(
            'SELECT aps.*, s.name as service_name, st.display_name as staff_name
             FROM appointment_services aps
             JOIN services s ON s.id = aps.service_id
             LEFT JOIN staff st ON st.id = aps.staff_id
             WHERE aps.appointment_id = ? ORDER BY aps.sort_order'
        );
        $stmt->execute([$id]);
        $apt['services'] = $stmt->fetchAll();
        return $apt;
    }

    public static function updateStatus(int $id, string $status, int $changedBy): array
    {
        $allowed = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
        if (!in_array($status, $allowed, true)) {
            throw new \InvalidArgumentException('وضعیت نامعتبر');
        }

        $pdo = Connection::get();
        $siteId = TenantContext::siteId();
        $old = $pdo->prepare('SELECT status, customer_id FROM appointments WHERE id = ? AND site_id = ?');
        $old->execute([$id, $siteId]);
        $row = $old->fetch();
        if (!$row) {
            throw new \InvalidArgumentException('نوبت یافت نشد');
        }

        $pdo->prepare('UPDATE appointments SET status = ?, updated_at = NOW() WHERE id = ? AND site_id = ?')
            ->execute([$status, $id, $siteId]);
        $pdo->prepare(
            'INSERT INTO appointment_status_history (appointment_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?)'
        )->execute([$id, $row['status'], $status, $changedBy]);

        NotificationService::notifyCustomerStatus($id, (int) $row['customer_id'], $status);
        SmsService::onStatusChange($id, $status);
        if ($status === 'completed') {
            SmsService::sendSurveyLink($id);
        }

        return self::getById($id);
    }

    public static function list(array $filters = []): array
    {
        $pdo = Connection::get();
        $siteId = TenantContext::siteId();
        $sql = 'SELECT a.*, u.name as customer_name, u.phone as customer_phone FROM appointments a
                JOIN users u ON u.id = a.customer_id WHERE a.site_id = ?';
        $params = [$siteId];

        if (!empty($filters['staff_id'])) {
            $sql .= ' AND EXISTS (SELECT 1 FROM appointment_services aps WHERE aps.appointment_id = a.id AND aps.staff_id = ?)';
            $params[] = $filters['staff_id'];
        }
        if (!empty($filters['date_from'])) {
            $sql .= ' AND DATE(a.start_at) >= DATE(?)';
            $params[] = $filters['date_from'];
        }
        if (!empty($filters['date_to'])) {
            $sql .= ' AND DATE(a.start_at) <= DATE(?)';
            $params[] = $filters['date_to'];
        }
        if (!empty($filters['status'])) {
            $sql .= ' AND a.status = ?';
            $params[] = $filters['status'];
        }
        if (!empty($filters['customer_id'])) {
            $sql .= ' AND a.customer_id = ?';
            $params[] = $filters['customer_id'];
        }

        $sql .= ' ORDER BY a.start_at DESC LIMIT 200';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll();

        foreach ($items as &$item) {
            $stmt = $pdo->prepare(
                'SELECT aps.*, s.name as service_name FROM appointment_services aps
                 JOIN services s ON s.id = aps.service_id WHERE aps.appointment_id = ?'
            );
            $stmt->execute([$item['id']]);
            $item['services'] = $stmt->fetchAll();
        }

        return $items;
    }
}
