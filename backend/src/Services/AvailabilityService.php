<?php

declare(strict_types=1);

namespace Salon\Services;

use DateInterval;
use DateTime;
use Salon\Database\Connection;
use Salon\Database\Migrator;

final class AvailabilityService
{
    public static function getSlots(array $serviceIds, ?int $staffId, string $date): array
    {
        Migrator::ensureStaffWorkingHours();
        $pdo = Connection::get();
        $settings = $pdo->query('SELECT * FROM salon_settings WHERE id = 1')->fetch();
        $hours = BusinessHoursService::decode($settings['business_hours_json'] ?? '{}');
        $rules = json_decode($settings['booking_rules_json'] ?? '{}', true);
        $slotMinutes = 15;

        $placeholders = implode(',', array_fill(0, count($serviceIds), '?'));
        $stmt = $pdo->prepare("SELECT * FROM services WHERE id IN ($placeholders) AND is_active = 1");
        $stmt->execute($serviceIds);
        $services = $stmt->fetchAll();
        if (count($services) !== count($serviceIds)) {
            throw new \InvalidArgumentException('خدمات نامعتبر');
        }

        $totalDuration = array_sum(array_column($services, 'duration_minutes'));

        $staffList = self::resolveStaff($serviceIds, $staffId);
        if (empty($staffList)) {
            return [];
        }

        $dayOfWeek = (int) (new DateTime($date))->format('w');
        $dayHours = $hours[(string) $dayOfWeek] ?? $hours[$dayOfWeek] ?? null;
        if (!$dayHours || !empty($dayHours['closed'])) {
            return [];
        }

        $open = $dayHours['open'] ?? '09:00';
        $close = $dayHours['close'] ?? '21:00';
        $slots = [];

        foreach ($staffList as $staff) {
            $staffHours = self::getStaffHours((int) $staff['id'], $dayOfWeek, $open, $close);
            if ($staffHours === null) {
                continue;
            }
            $start = new DateTime("$date {$staffHours['start']}");
            $end = new DateTime("$date {$staffHours['end']}");
            $minNotice = (int) ($rules['min_notice_hours'] ?? 2);
            $earliest = (new DateTime())->modify("+{$minNotice} hours");

            while ($start < $end) {
                $slotEnd = (clone $start)->modify("+{$totalDuration} minutes");
                if ($slotEnd > $end) {
                    break;
                }
                if ($start >= $earliest && self::isFree((int) $staff['id'], $start, $slotEnd, $date)) {
                    $slots[] = [
                        'start' => $start->format('Y-m-d H:i:s'),
                        'end' => $slotEnd->format('Y-m-d H:i:s'),
                        'staff_id' => (int) $staff['id'],
                        'staff_name' => $staff['display_name'],
                    ];
                }
                $start->add(new DateInterval("PT{$slotMinutes}M"));
            }
        }

        usort($slots, fn ($a, $b) => strcmp($a['start'], $b['start']));
        return $slots;
    }

    private static function resolveStaff(array $serviceIds, ?int $staffId): array
    {
        $pdo = Connection::get();
        if ($staffId) {
            $stmt = $pdo->prepare(
                'SELECT s.* FROM staff s WHERE s.id = ? AND s.is_accepting_bookings = 1'
            );
            $stmt->execute([$staffId]);
            $staff = $stmt->fetch();
            return $staff ? [$staff] : [];
        }

        $ph = implode(',', array_fill(0, count($serviceIds), '?'));
        $stmt = $pdo->prepare(
            "SELECT DISTINCT s.* FROM staff s
             JOIN service_staff ss ON ss.staff_id = s.id
             WHERE ss.service_id IN ($ph) AND s.is_accepting_bookings = 1"
        );
        $stmt->execute($serviceIds);
        $list = $stmt->fetchAll();
        if (!empty($list)) {
            return $list;
        }

        return $pdo->query('SELECT * FROM staff WHERE is_accepting_bookings = 1')->fetchAll();
    }

    private static function getStaffHours(int $staffId, int $day, string $defaultOpen, string $defaultClose): ?array
    {
        $pdo = Connection::get();
        $stmt = $pdo->prepare(
            'SELECT * FROM staff_working_hours WHERE staff_id = ? AND day_of_week = ?'
        );
        $stmt->execute([$staffId, $day]);
        $row = $stmt->fetch();
        if ($row) {
            $start = (string) ($row['start_time'] ?? '');
            $end = (string) ($row['end_time'] ?? '');
            if ($start === '00:00' && $end === '00:00') {
                return null;
            }
            if ($start !== '' && $end !== '' && $start < $end) {
                return ['start' => $start, 'end' => $end];
            }
        }
        return ['start' => $defaultOpen, 'end' => $defaultClose];
    }

    private static function isFree(int $staffId, DateTime $start, DateTime $end, string $date): bool
    {
        $pdo = Connection::get();
        $s = $start->format('Y-m-d H:i:s');
        $e = $end->format('Y-m-d H:i:s');

        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM appointments a
             JOIN appointment_services aps ON aps.appointment_id = a.id
             WHERE aps.staff_id = ? AND a.status NOT IN ("cancelled")
             AND a.start_at < ? AND a.end_at > ?'
        );
        $stmt->execute([$staffId, $e, $s]);
        if ((int) $stmt->fetchColumn() > 0) {
            return false;
        }

        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM staff_time_off WHERE staff_id = ? AND start_at < ? AND end_at > ?'
        );
        $stmt->execute([$staffId, $e, $s]);
        if ((int) $stmt->fetchColumn() > 0) {
            return false;
        }

        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM blocked_slots WHERE (staff_id IS NULL OR staff_id = ?) AND start_at < ? AND end_at > ?'
        );
        $stmt->execute([$staffId, $e, $s]);
        return (int) $stmt->fetchColumn() === 0;
    }
}
