<?php

declare(strict_types=1);

namespace Salon\Services;

use Salon\Database\Connection;

final class NotificationService
{
    public static function create(int $userId, string $type, string $title, string $body, array $payload = []): void
    {
        Connection::get()->prepare(
            'INSERT INTO notifications (user_id, type, title, body, payload_json) VALUES (?, ?, ?, ?, ?)'
        )->execute([$userId, $type, $title, $body, json_encode($payload, JSON_UNESCAPED_UNICODE)]);
    }

    public static function notifyStaffNewAppointment(int $appointmentId, int $staffId): void
    {
        $pdo = Connection::get();
        $staff = $pdo->prepare('SELECT * FROM staff WHERE id = ?');
        $staff->execute([$staffId]);
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
        $users = $pdo->query(
            "SELECT id FROM users WHERE role IN ('super_admin','manager')"
        )->fetchAll();
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
        $sql = 'SELECT * FROM notifications WHERE user_id = ?';
        if ($unreadOnly) {
            $sql .= ' AND read_at IS NULL';
        }
        $sql .= ' ORDER BY created_at DESC LIMIT 50';
        $stmt = Connection::get()->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    public static function markRead(int $id, int $userId): void
    {
        Connection::get()->prepare(
            'UPDATE notifications SET read_at = datetime("now") WHERE id = ? AND user_id = ?'
        )->execute([$id, $userId]);
    }

    public static function markAllRead(int $userId): void
    {
        Connection::get()->prepare(
            'UPDATE notifications SET read_at = datetime("now") WHERE user_id = ? AND read_at IS NULL'
        )->execute([$userId]);
    }
}
