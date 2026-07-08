<?php

declare(strict_types=1);

namespace Salon\Services\Sms;

/**
 * کاوه‌نگار.
 * credentials: { apikey, sender }
 */
final class KavenegarDriver implements SmsDriver
{
    public function __construct(private array $credentials) {}

    public function send(string $phone, string $message): array
    {
        $apikey = trim((string) ($this->credentials['apikey'] ?? ''));
        $sender = trim((string) ($this->credentials['sender'] ?? ''));
        if ($apikey === '') {
            return ['ok' => false, 'response' => 'کلید API کاوه‌نگار تنظیم نشده'];
        }
        $url = 'https://api.kavenegar.com/v1/' . $apikey . '/sms/send.json';
        $body = http_build_query([
            'receptor' => $phone,
            'message' => $message,
            'sender' => $sender,
        ]);
        $res = HttpClient::request('POST', $url, [
            'Content-Type' => 'application/x-www-form-urlencoded',
        ], $body);
        $ok = $res['status'] >= 200 && $res['status'] < 300 && str_contains($res['body'], '"status":200');
        return ['ok' => $ok, 'response' => $res['body']];
    }

    public function sendPattern(string $phone, string $pattern, array $params): array
    {
        $apikey = trim((string) ($this->credentials['apikey'] ?? ''));
        if ($apikey === '') {
            return ['ok' => false, 'response' => 'کلید API کاوه‌نگار تنظیم نشده'];
        }
        $query = [
            'receptor' => $phone,
            'template' => $pattern,
        ];
        $i = 0;
        foreach (array_values($params) as $value) {
            $i++;
            $query['token' . ($i === 1 ? '' : $i)] = $value;
            if ($i >= 3) {
                break;
            }
        }
        $url = 'https://api.kavenegar.com/v1/' . $apikey . '/verify/lookup.json?' . http_build_query($query);
        $res = HttpClient::request('GET', $url);
        $ok = $res['status'] >= 200 && $res['status'] < 300 && str_contains($res['body'], '"status":200');
        return ['ok' => $ok, 'response' => $res['body']];
    }
}
