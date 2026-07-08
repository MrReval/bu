<?php

declare(strict_types=1);

namespace Salon\Services\Payment;

use Salon\Services\Sms\HttpClient;

/**
 * درگاه پرداخت زیبال.
 * مبالغ به ریال ارسال می‌شوند (قیمت‌های سیستم تومان است → ×۱۰).
 */
final class ZibalService
{
    private const BASE = 'https://gateway.zibal.ir';

    /**
     * @return array{ok:bool, trackId?:string, url?:string, error?:string}
     */
    public static function request(string $merchant, int $amountToman, string $callbackUrl, string $description, ?int $orderId = null): array
    {
        $payload = json_encode([
            'merchant' => $merchant,
            'amount' => $amountToman * 10,
            'callbackUrl' => $callbackUrl,
            'description' => $description,
            'orderId' => (string) ($orderId ?? ''),
        ], JSON_UNESCAPED_UNICODE);

        $res = HttpClient::request('POST', self::BASE . '/v1/request', [
            'Content-Type' => 'application/json',
        ], $payload);

        $data = json_decode($res['body'], true);
        if (is_array($data) && (int) ($data['result'] ?? 0) === 100 && !empty($data['trackId'])) {
            $trackId = (string) $data['trackId'];
            return [
                'ok' => true,
                'trackId' => $trackId,
                'url' => self::BASE . '/start/' . $trackId,
            ];
        }
        return ['ok' => false, 'error' => 'خطای درگاه: ' . ($data['message'] ?? $res['body'])];
    }

    /**
     * @return array{ok:bool, refNumber?:string, amount?:int, error?:string}
     */
    public static function verify(string $merchant, string $trackId): array
    {
        $payload = json_encode(['merchant' => $merchant, 'trackId' => $trackId], JSON_UNESCAPED_UNICODE);
        $res = HttpClient::request('POST', self::BASE . '/v1/verify', [
            'Content-Type' => 'application/json',
        ], $payload);

        $data = json_decode($res['body'], true);
        if (is_array($data) && (int) ($data['result'] ?? 0) === 100) {
            return [
                'ok' => true,
                'refNumber' => (string) ($data['refNumber'] ?? ''),
                'amount' => (int) ($data['amount'] ?? 0),
            ];
        }
        return ['ok' => false, 'error' => (string) ($data['message'] ?? $res['body'])];
    }
}
