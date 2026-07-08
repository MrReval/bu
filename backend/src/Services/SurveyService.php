<?php

declare(strict_types=1);

namespace Salon\Services;

use Salon\Config;
use Salon\Database\Connection;
use Salon\Tenant\TenantContext;

/**
 * نظرسنجی پس از خدمات با لینک امضاشده.
 */
final class SurveyService
{
    /** توکن امضاشده برای لینک نظرسنجی یک نوبت */
    public static function token(int $appointmentId): string
    {
        return substr(hash_hmac('sha256', 'survey:' . $appointmentId, Config::appKey()), 0, 20);
    }

    public static function verify(int $appointmentId, string $token): bool
    {
        return hash_equals(self::token($appointmentId), $token);
    }

    /** اطلاعات موردنیاز صفحه نظرسنجی */
    public static function info(int $appointmentId, string $token): array
    {
        if (!self::verify($appointmentId, $token)) {
            throw new \InvalidArgumentException('لینک نظرسنجی نامعتبر است');
        }
        $pdo = Connection::get();
        $sid = TenantContext::siteId();
        $stmt = $pdo->prepare('SELECT id, customer_id, start_at, status FROM appointments WHERE id = ? AND site_id = ?');
        $stmt->execute([$appointmentId, $sid]);
        $apt = $stmt->fetch();
        if (!$apt) {
            throw new \InvalidArgumentException('نوبت یافت نشد');
        }
        $salon = $pdo->prepare('SELECT name FROM salon_settings WHERE site_id = ?');
        $salon->execute([$sid]);

        $done = $pdo->prepare('SELECT id FROM survey_responses WHERE appointment_id = ? AND site_id = ?');
        $done->execute([$appointmentId, $sid]);

        return [
            'salon_name' => (string) ($salon->fetchColumn() ?: ''),
            'already_submitted' => (bool) $done->fetch(),
        ];
    }

    public static function submit(int $appointmentId, string $token, int $rating, string $comment): void
    {
        if (!self::verify($appointmentId, $token)) {
            throw new \InvalidArgumentException('لینک نظرسنجی نامعتبر است');
        }
        $rating = max(1, min(5, $rating));
        $pdo = Connection::get();
        $sid = TenantContext::siteId();

        $stmt = $pdo->prepare('SELECT customer_id FROM appointments WHERE id = ? AND site_id = ?');
        $stmt->execute([$appointmentId, $sid]);
        $apt = $stmt->fetch();
        if (!$apt) {
            throw new \InvalidArgumentException('نوبت یافت نشد');
        }

        $exists = $pdo->prepare('SELECT id FROM survey_responses WHERE appointment_id = ? AND site_id = ?');
        $exists->execute([$appointmentId, $sid]);
        if ($exists->fetch()) {
            throw new \InvalidArgumentException('نظر شما قبلاً ثبت شده است');
        }

        $pdo->prepare(
            'INSERT INTO survey_responses (site_id, appointment_id, customer_id, rating, comment) VALUES (?,?,?,?,?)'
        )->execute([$sid, $appointmentId, (int) $apt['customer_id'], $rating, mb_substr(trim($comment), 0, 1000)]);
    }

    /** فهرست نظرات ثبت‌شده برای پنل مدیریت */
    public static function listResponses(): array
    {
        $pdo = Connection::get();
        $sid = TenantContext::siteId();
        $stmt = $pdo->prepare(
            'SELECT r.id, r.rating, r.comment, r.created_at, u.name AS customer_name
             FROM survey_responses r
             LEFT JOIN users u ON u.id = r.customer_id
             WHERE r.site_id = ? ORDER BY r.id DESC LIMIT 300'
        );
        $stmt->execute([$sid]);
        $rows = $stmt->fetchAll();

        $agg = $pdo->prepare('SELECT COUNT(*) AS c, COALESCE(AVG(rating),0) AS avg FROM survey_responses WHERE site_id = ?');
        $agg->execute([$sid]);
        $a = $agg->fetch() ?: ['c' => 0, 'avg' => 0];

        return [
            'responses' => $rows,
            'count' => (int) $a['c'],
            'average' => round((float) $a['avg'], 1),
        ];
    }
}
