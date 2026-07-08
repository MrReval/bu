<?php

declare(strict_types=1);

namespace Salon\Services\Sms;

/**
 * ملی پیامک — کنسول جدید (REST).
 * credentials: { apikey, from }
 */
final class MelipayamakDriver implements SmsDriver
{
    public function __construct(private array $credentials) {}

    public function send(string $phone, string $message): array
    {
        $apikey = trim((string) ($this->credentials['apikey'] ?? ''));
        $from = trim((string) ($this->credentials['from'] ?? ''));
        if ($apikey === '') {
            return ['ok' => false, 'response' => 'کلید API ملی‌پیامک تنظیم نشده'];
        }
        $url = 'https://console.melipayamak.com/api/send/simple/' . $apikey;
        $payload = json_encode(['from' => $from, 'to' => $phone, 'text' => $message], JSON_UNESCAPED_UNICODE);
        $res = HttpClient::request('POST', $url, ['Content-Type' => 'application/json'], $payload);
        $ok = $res['status'] >= 200 && $res['status'] < 300 && !str_contains($res['body'], '"recId":0');
        return ['ok' => $ok, 'response' => $res['body']];
    }

    public function sendPattern(string $phone, string $pattern, array $params): array
    {
        $apikey = trim((string) ($this->credentials['apikey'] ?? ''));
        if ($apikey === '') {
            return ['ok' => false, 'response' => 'کلید API ملی‌پیامک تنظیم نشده'];
        }
        $url = 'https://console.melipayamak.com/api/send/shared/' . $apikey;
        $payload = json_encode([
            'bodyId' => (int) $pattern,
            'to' => $phone,
            'args' => array_values($params),
        ], JSON_UNESCAPED_UNICODE);
        $res = HttpClient::request('POST', $url, ['Content-Type' => 'application/json'], $payload);
        $ok = $res['status'] >= 200 && $res['status'] < 300;
        return ['ok' => $ok, 'response' => $res['body']];
    }
}
