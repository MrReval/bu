<?php

declare(strict_types=1);

namespace Salon\Services\Sms;

final class SmsManager
{
    /**
     * @param array<string,mixed> $credentials
     */
    public static function driver(string $provider, array $credentials): SmsDriver
    {
        return match ($provider) {
            'smsir' => new SmsIrDriver($credentials),
            'kavenegar' => new KavenegarDriver($credentials),
            default => new MelipayamakDriver($credentials),
        };
    }

    /** @return array<string,string> فهرست پرووایدرهای پشتیبانی‌شده */
    public static function providers(): array
    {
        return [
            'melipayamak' => 'ملی پیامک',
            'smsir' => 'پیامک‌رسان SMS.ir',
            'kavenegar' => 'کاوه‌نگار',
        ];
    }
}
