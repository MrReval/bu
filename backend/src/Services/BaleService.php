<?php

declare(strict_types=1);

namespace Salon\Services;

use Salon\Database\Connection;
use Salon\Services\Sms\HttpClient;

/**
 * ارسال گزارش روزانه مدیر در پیام‌رسان بله (Bale Bot API).
 */
final class BaleService
{
    /** ارسال یک پیام متنی به چت تعیین‌شده */
    public static function send(int $siteId, string $text): array
    {
        $cfg = self::config($siteId);
        $token = trim((string) ($cfg['bale_token'] ?? ''));
        $chatId = trim((string) ($cfg['bale_chat_id'] ?? ''));
        if ($token === '' || $chatId === '') {
            return ['ok' => false, 'response' => 'توکن یا شناسه چت بله تنظیم نشده است'];
        }
        $url = 'https://tapi.bale.ai/bot' . $token . '/sendMessage';
        $payload = json_encode(['chat_id' => $chatId, 'text' => $text], JSON_UNESCAPED_UNICODE);
        $res = HttpClient::request('POST', $url, ['Content-Type' => 'application/json'], $payload);
        $ok = $res['status'] >= 200 && $res['status'] < 300 && str_contains($res['body'], '"ok":true');
        return ['ok' => $ok, 'response' => $res['body']];
    }

    /** ساخت و ارسال گزارش روزِ مشخص (پیش‌فرض: امروز) */
    public static function dailyReport(int $siteId, ?string $date = null): array
    {
        $date = $date ?: date('Y-m-d');
        $from = $date . ' 00:00:00';
        $to = $date . ' 23:59:59';
        $pdo = Connection::get();

        $salon = $pdo->prepare('SELECT name FROM salon_settings WHERE site_id = ?');
        $salon->execute([$siteId]);
        $name = (string) ($salon->fetchColumn() ?: 'سالن');

        $stmt = $pdo->prepare(
            'SELECT
                COUNT(*) AS total,
                SUM(status = "completed") AS completed,
                SUM(status = "cancelled") AS cancelled,
                SUM(status IN ("pending","confirmed")) AS upcoming,
                COALESCE(SUM(CASE WHEN status = "completed" THEN total_price ELSE 0 END), 0) AS revenue
             FROM appointments WHERE site_id = ? AND start_at BETWEEN ? AND ?'
        );
        $stmt->execute([$siteId, $from, $to]);
        $s = $stmt->fetch() ?: [];

        $newCustomers = $pdo->prepare(
            'SELECT COUNT(*) FROM users WHERE site_id = ? AND role = "customer" AND created_at BETWEEN ? AND ?'
        );
        $newCustomers->execute([$siteId, $from, $to]);

        $fa = static fn ($n) => number_format((int) $n);
        $text = "📊 گزارش روزانه {$name}\n"
            . "📅 تاریخ: {$date}\n"
            . "———————————————\n"
            . '📋 کل نوبت‌ها: ' . $fa($s['total'] ?? 0) . "\n"
            . '✅ انجام‌شده: ' . $fa($s['completed'] ?? 0) . "\n"
            . '⏳ پیش‌رو: ' . $fa($s['upcoming'] ?? 0) . "\n"
            . '❌ لغوشده: ' . $fa($s['cancelled'] ?? 0) . "\n"
            . '👥 مشتری جدید: ' . $fa($newCustomers->fetchColumn()) . "\n"
            . '💰 درآمد روز: ' . number_format((float) ($s['revenue'] ?? 0)) . " تومان";

        return self::send($siteId, $text);
    }

    /** @return array<string,mixed> */
    private static function config(int $siteId): array
    {
        $stmt = Connection::get()->prepare(
            'SELECT bale_token, bale_chat_id, bale_daily_enabled FROM salon_settings WHERE site_id = ?'
        );
        $stmt->execute([$siteId]);
        return $stmt->fetch() ?: [];
    }
}
