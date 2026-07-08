<?php

declare(strict_types=1);

namespace Salon\Services\Sms;

/**
 * پیامک‌رسان SMS.ir — نسخه v1.
 * credentials: { apikey, lineNumber }
 */
final class SmsIrDriver implements SmsDriver
{
    public function __construct(private array $credentials) {}

    public function send(string $phone, string $message): array
    {
        $apikey = trim((string) ($this->credentials['apikey'] ?? ''));
        $line = trim((string) ($this->credentials['lineNumber'] ?? ''));
        if ($apikey === '') {
            return ['ok' => false, 'response' => 'کلید API پیامک‌رسان تنظیم نشده'];
        }
        $url = 'https://api.sms.ir/v1/send/bulk';
        $payload = json_encode([
            'lineNumber' => $line,
            'messageText' => $message,
            'mobiles' => [$phone],
        ], JSON_UNESCAPED_UNICODE);
        $res = HttpClient::request('POST', $url, [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'x-api-key' => $apikey,
        ], $payload);
        $ok = $res['status'] >= 200 && $res['status'] < 300 && str_contains($res['body'], '"status":1');
        return ['ok' => $ok, 'response' => $res['body']];
    }

    public function sendPattern(string $phone, string $pattern, array $params): array
    {
        $apikey = trim((string) ($this->credentials['apikey'] ?? ''));
        if ($apikey === '') {
            return ['ok' => false, 'response' => 'کلید API پیامک‌رسان تنظیم نشده'];
        }
        $parameters = [];
        foreach ($params as $name => $value) {
            $parameters[] = ['name' => (string) $name, 'value' => (string) $value];
        }
        $url = 'https://api.sms.ir/v1/send/verify';
        $payload = json_encode([
            'mobile' => $phone,
            'templateId' => (int) $pattern,
            'parameters' => $parameters,
        ], JSON_UNESCAPED_UNICODE);
        $res = HttpClient::request('POST', $url, [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'x-api-key' => $apikey,
        ], $payload);
        $ok = $res['status'] >= 200 && $res['status'] < 300 && str_contains($res['body'], '"status":1');
        return ['ok' => $ok, 'response' => $res['body']];
    }
}
