<?php

declare(strict_types=1);

namespace Salon\Services;

use Salon\Database\Connection;
use Salon\Tenant\TenantContext;

/**
 * باشگاه مشتریان: فهرست مشتریان، تولدها و ارسال پیامک گروهی.
 */
final class CustomerClubService
{
    /** @return array<int,array<string,mixed>> */
    public static function customers(): array
    {
        $pdo = Connection::get();
        $stmt = $pdo->prepare(
            'SELECT u.id, u.name, u.phone, u.created_at, c.birth_date,
                    (SELECT COUNT(*) FROM appointments a WHERE a.customer_id = u.id) AS visits
             FROM users u
             LEFT JOIN customers c ON c.user_id = u.id
             WHERE u.site_id = ? AND u.role = "customer"
             ORDER BY u.created_at DESC LIMIT 1000'
        );
        $stmt->execute([TenantContext::siteId()]);
        return $stmt->fetchAll();
    }

    /** مشتریانی که امروز (یا تاریخ داده‌شده) تولدشان است — بر پایه ماه/روز */
    public static function birthdays(?string $mmdd = null): array
    {
        $mmdd = $mmdd ?: date('m-d');
        $pdo = Connection::get();
        $stmt = $pdo->prepare(
            'SELECT u.id, u.name, u.phone, c.birth_date
             FROM users u JOIN customers c ON c.user_id = u.id
             WHERE u.site_id = ? AND u.role = "customer" AND c.birth_date IS NOT NULL AND c.birth_date <> ""'
        );
        $stmt->execute([TenantContext::siteId()]);
        $out = [];
        foreach ($stmt->fetchAll() as $r) {
            $norm = str_replace('/', '-', (string) $r['birth_date']);
            // انتظار می‌رود قالب YYYY-MM-DD باشد؛ ماه-روز را استخراج می‌کنیم
            if (preg_match('/^\d{3,4}-(\d{2})-(\d{2})$/', $norm, $m)) {
                if (($m[1] . '-' . $m[2]) === $mmdd) {
                    $out[] = $r;
                }
            }
        }
        return $out;
    }

    /**
     * ارسال پیامک گروهی به مخاطبان انتخابی.
     * @param string $audience all|selected|birthday
     * @param int[] $ids
     * @return array{sent:int, failed:int, total:int}
     */
    public static function broadcast(string $message, string $audience, array $ids = []): array
    {
        $siteId = TenantContext::siteId();
        $message = trim($message);
        if ($message === '') {
            throw new \InvalidArgumentException('متن پیام الزامی است');
        }

        $recipients = [];
        if ($audience === 'birthday') {
            $recipients = array_column(self::birthdays(), 'phone');
        } elseif ($audience === 'selected') {
            if (empty($ids)) {
                throw new \InvalidArgumentException('حداقل یک مشتری انتخاب کنید');
            }
            $ph = implode(',', array_fill(0, count($ids), '?'));
            $stmt = Connection::get()->prepare(
                "SELECT phone FROM users WHERE site_id = ? AND role = 'customer' AND id IN ($ph)"
            );
            $stmt->execute(array_merge([$siteId], array_map('intval', $ids)));
            $recipients = array_column($stmt->fetchAll(), 'phone');
        } else {
            $stmt = Connection::get()->prepare(
                'SELECT phone FROM users WHERE site_id = ? AND role = "customer" AND phone IS NOT NULL AND phone <> ""'
            );
            $stmt->execute([$siteId]);
            $recipients = array_column($stmt->fetchAll(), 'phone');
        }

        $recipients = array_values(array_unique(array_filter($recipients)));
        $sent = 0;
        $failed = 0;
        foreach ($recipients as $phone) {
            $res = SmsService::sendForSite($siteId, (string) $phone, $message);
            if (!empty($res['ok'])) {
                $sent++;
            } else {
                $failed++;
            }
        }

        return ['sent' => $sent, 'failed' => $failed, 'total' => count($recipients)];
    }
}
