<?php

declare(strict_types=1);

namespace Salon\Services;

use Salon\Database\Connection;
use Salon\Tenant\TenantContext;

final class NotificationService
{
    public static function create(int $userId, string $type, string $title, string $body, array $payload = []): void
    {
        Connection::get()->prepare(
            'INSERT INTO notifications (site_id, user_id, type, title, body, payload_json) VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([TenantContext::siteId(), $userId, $type, $title, $body, json_encode($payload, JSON_UNESCAPED_UNICODE)]);
    }

    public static function notifyStaffNewAppointment(int $appointmentId, int $staffId): void
    {
        $pdo = Connection::get();
        $staff = $pdo->prepare('SELECT * FROM staff WHERE id = ? AND site_id = ?');
        $staff->execute([$staffId, TenantContext::siteId()]);
        $s = $staff->fetch();
        if (!$s || !$s['user_id']) {
            return;
        }
        $apt = AppointmentService::getById($appointmentId);
        self::create(
            (int) $s['user_id'],
            'new_appointment',
            'نوبت جدید',
            sprintf('نوبت جدید از %s در %s', $apt['customer_name'], $apt['start_at']),
            ['appointment_id' => $appointmentId]
        );
    }

    public static function notifyManagersNewAppointment(int $appointmentId): void
    {
        $pdo = Connection::get();
        $stmt = $pdo->prepare(
            "SELECT id FROM users WHERE site_id = ? AND role IN ('super_admin','manager')"
        );
        $stmt->execute([TenantContext::siteId()]);
        $users = $stmt->fetchAll();
        $apt = AppointmentService::getById($appointmentId);
        foreach ($users as $u) {
            self::create(
                (int) $u['id'],
                'new_appointment',
                'نوبت جدید',
                sprintf('نوبت جدید از %s', $apt['customer_name']),
                ['appointment_id' => $appointmentId]
            );
        }
    }

    public static function notifyManagersDepositReceipt(int $appointmentId, int $paymentId): void
    {
        $pdo = Connection::get();
        $stmt = $pdo->prepare(
            "SELECT id FROM users WHERE site_id = ? AND role IN ('super_admin','manager')"
        );
        $stmt->execute([TenantContext::siteId()]);
        $users = $stmt->fetchAll();
        try {
            $apt = AppointmentService::getById($appointmentId);
            $name = $apt['customer_name'] ?? 'مشتری';
            $amount = number_format((float) ($apt['deposit_amount'] ?? 0));
        } catch (\Throwable) {
            $name = 'مشتری';
            $amount = '—';
        }
        foreach ($users as $u) {
            self::create(
                (int) $u['id'],
                'deposit_receipt',
                'فیش بیعانه جدید',
                sprintf('فیش کارت‌به‌کارت از %s به مبلغ %s تومان — نیاز به تأیید', $name, $amount),
                ['appointment_id' => $appointmentId, 'payment_id' => $paymentId]
            );
        }
    }

    public static function notifyCustomerStatus(int $appointmentId, int $customerId, string $status): void
    {
        $labels = [
            'confirmed' => 'تأیید شد',
            'cancelled' => 'لغو شد',
            'completed' => 'انجام شد',
            'in_progress' => 'در حال انجام',
        ];
        $label = $labels[$status] ?? $status;
        self::create(
            $customerId,
            'status_change',
            'وضعیت نوبت',
            "نوبت شما $label",
            ['appointment_id' => $appointmentId, 'status' => $status]
        );
    }

    public static function listForUser(int $userId, bool $unreadOnly = false): array
    {
        $sql = 'SELECT * FROM notifications WHERE user_id = ? AND site_id = ?';
        if ($unreadOnly) {
            $sql .= ' AND read_at IS NULL';
        }
        $sql .= ' ORDER BY created_at DESC LIMIT 50';
        $stmt = Connection::get()->prepare($sql);
        $stmt->execute([$userId, TenantContext::siteId()]);
        return $stmt->fetchAll();
    }

    public static function markRead(int $id, int $userId): void
    {
        Connection::get()->prepare(
            'UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ? AND site_id = ?'
        )->execute([$id, $userId, TenantContext::siteId()]);
    }

    public static function markAllRead(int $userId): void
    {
        Connection::get()->prepare(
            'UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND site_id = ? AND read_at IS NULL'
        )->execute([$userId, TenantContext::siteId()]);
    }
}
